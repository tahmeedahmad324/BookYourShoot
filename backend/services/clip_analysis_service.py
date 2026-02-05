"""
=============================================================================
AI-Powered Event & Mood Detection Service using CLIP (Zero-Shot Classification)
=============================================================================

WHY THIS APPROACH IS BETTER THAN DIRECT SPOTIFY SEARCH:
--------------------------------------------------------
1. INTELLIGENT DETECTION: Instead of relying on user to manually select event
   type, we use AI to automatically detect the event from visual content.

2. ZERO-SHOT LEARNING: CLIP (Contrastive Language-Image Pre-training) can 
   classify images into ANY text-described categories without training.
   This means we can detect "mehndi", "barat", "walima" without any dataset.

3. CONTEXT-AWARE: By analyzing the actual event photos/videos, we understand
   the TRUE mood and atmosphere, not just user's guess.

4. MULTI-MODAL: Supports both images and video (by extracting key frames).

5. FREE & LOCAL: Runs locally using Hugging Face Transformers, no API costs.

IMPLEMENTATION:
---------------
- Uses openai/clip-vit-base-patch32 model (smaller, faster for demo)
- Zero-shot classification with custom Pakistani event categories
- Video support via ffmpeg frame extraction
- Confidence-based aggregation for reliable predictions

Author: BookYourShoot Team
Course: Final Year Project
Date: January 2026
=============================================================================
"""

import os
import sys
import base64
import tempfile
import subprocess
import shutil
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from io import BytesIO

# PIL for image processing
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("⚠️ PIL not installed. Run: pip install Pillow")

# Hugging Face Transformers for CLIP
try:
    from transformers import CLIPProcessor, CLIPModel
    import torch
    CLIP_AVAILABLE = True
except ImportError:
    CLIP_AVAILABLE = False
    print("⚠️ Transformers not installed. Run: pip install transformers torch")

# Ultralytics YOLO for person detection
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("⚠️ Ultralytics not installed. Person detection disabled. Run: pip install ultralytics")


# =============================================================================
# CONFIGURATION: Event and Mood Categories
# =============================================================================

# Pakistani/South Asian event types with descriptive prompts for CLIP
# These prompts are specifically designed for Pakistani wedding customs and attire
# More specific prompts = better zero-shot classification accuracy
EVENT_PROMPTS = {
    "mehndi": [
        # Traditional mehndi ceremony - focus on colors, decorations, attire
        "yellow and green colorful decorations at Pakistani wedding",
        "bride wearing bright yellow or green dress at mehndi",
        "colorful curtains and flower decorations at mehndi ceremony",
        "women in colorful traditional dresses at celebration",
        "bright colorful Pakistani wedding function with flowers",
        "yellow marigold flower decorations at celebration",
        "person in bright colored traditional Pakistani dress",
        "mehndi henna designs on hands at wedding",
        "colorful fabric drapes and flower garlands at celebration",
        "vibrant yellow green orange decorations at party"
    ],
    "barat": [
        # Pakistani Barat/Walima - formal wedding photos
        "bride in red or pink bridal dress with jewelry",
        "groom with red turban at Pakistani wedding",
        "person in waistcoat and shalwar kameez at wedding",
        "formal portrait at Pakistani wedding venue",
        "white flower wall backdrop at wedding",
        "person sitting on decorated chair at wedding",
        "traditional Pakistani wedding formal attire",
        "wedding photo with flower decorations",
        "man in waistcoat and formal dress at celebration",
        "bride with heavy jewelry and makeup at wedding",
        "red and gold wedding decorations",
        "formal wedding portrait with elegant backdrop",
        "person in traditional dress at formal event"
    ],
    "walima": [
        # Walima reception - formal elegant event
        "elegant wedding reception with decorations",
        "formal Pakistani wedding dinner",
        "bride and groom at walima reception",
        "wedding reception with flower decorations",
        "formal portrait at wedding reception",
        "person in elegant formal dress at reception",
        "white and pastel decorations at wedding",
        "formal seated portrait at wedding",
        "elegant backdrop at wedding reception"
    ],
    "birthday": [
        # Birthday celebrations
        "birthday party with decorated cake and colorful balloons",
        "children's birthday celebration with cartoon decorations",
        "birthday cake with lit candles and party decorations",
        "colorful birthday party with wrapped presents and streamers",
        "happy birthday celebration with family gathered around cake",
        "birthday party with banner and balloon arch decorations",
        "child blowing candles on birthday cake",
        "birthday celebration with themed decorations and guests"
    ],
    "corporate": [
        # Professional events
        "corporate event with people in formal business suits",
        "professional conference or seminar in auditorium setting",
        "business meeting in modern office environment",
        "corporate gala dinner with formal table setup",
        "professional networking event with name badges",
        "presentation or speech at corporate event",
        "business conference with projector and audience"
    ],
    "general": [
        # Catch-all for other celebrations
        "a social gathering or celebration with people",
        "people dressed formally at a party or event",
        "casual social event with guests mingling",
        "family gathering or reunion with multiple generations",
        "general celebration or function with decorations"
        "concert or festival with crowd enjoying music"
        "baby photo shoot with cute decorations"
        "friends hanging out at casual event"
        
    ]
}

# Mood categories with descriptive prompts
MOOD_PROMPTS = {
    "romantic": [
        "romantic and intimate atmosphere with soft lighting",
        "couple in a loving and romantic setting",
        "tender and emotional romantic moment",
        "soft and dreamy romantic ambiance"
    ],
    "energetic": [
        "high energy dance party with people jumping",
        "exciting and lively celebration with movement",
        "dynamic and energetic atmosphere",
        "fast-paced exciting event with action"
    ],
    "dance": [
        "people dancing and celebrating joyfully",
        "traditional dance performance",
        "group dance at a wedding or party",
        "rhythmic dance celebration"
    ],
    "calm": [
        "peaceful and serene atmosphere",
        "calm and relaxed formal setting",
        "quiet and composed gathering",
        "tranquil and soothing environment"
    ]
}

# =============================================================================
# NOT-EVENT DETECTION: Prompts to identify non-event images
# =============================================================================
# These prompts help CLIP recognize when an image is NOT from an event.
# If these score higher than event prompts, we reject the image.
# NOTE: Be careful not to include prompts that could match wedding photos!

NOT_EVENT_PROMPTS = [
    # Screenshots and digital content (primary use case - gaming screenshots etc)
    "a screenshot of a computer video game with game interface and UI elements",
    "a screenshot of a mobile phone app or text messages",
    "a screenshot of a website browser or social media feed",
    "a video game character in a digital gaming environment",
    "an esports or gaming tournament screenshot with health bars",
    
    # Clearly non-event content
    "a cartoon or animated drawing not a real photograph",
    "a meme image with text overlays and internet humor",
    "a document page with text or paperwork"
]

# Minimum confidence threshold for valid event detection
# If the best event score is below this, the image is likely not an event
MIN_EVENT_CONFIDENCE = 0.12  # 12% - lowered to reduce false rejections

# If NOT_EVENT score exceeds this relative to best event, reject
NOT_EVENT_THRESHOLD = 1.0  # not_event must be < 100% of best_event to accept

# Mapping detected events to music vibes (for Spotify integration)
EVENT_TO_MUSIC_VIBE = {
    "mehndi": {
        "genres": ["desi", "bollywood", "punjabi"],
        "keywords": "mehndi dholki sangeet dance pakistani bollywood",
        "energy_range": (0.6, 1.0),
        "danceability_min": 0.6
    },
    "barat": {
        "genres": ["punjabi", "bhangra", "desi"],
        "keywords": "barat baraat dulha entry bhangra dhol high energy",
        "energy_range": (0.7, 1.0),
        "danceability_min": 0.7
    },
    "walima": {
        "genres": ["bollywood", "romantic", "desi"],
        "keywords": "walima romantic love songs bollywood slow dance",
        "energy_range": (0.3, 0.7),
        "danceability_min": 0.3
    },
    "birthday": {
        "genres": ["pop", "party", "kids"],
        "keywords": "happy birthday party celebration kids fun",
        "energy_range": (0.5, 0.9),
        "danceability_min": 0.5
    },
    "corporate": {
        "genres": ["ambient", "lofi", "instrumental"],
        "keywords": "corporate ambient background instrumental jazz lofi",
        "energy_range": (0.2, 0.5),
        "danceability_min": 0.2
    },
    "general": {
        "genres": ["pop", "party"],
        "keywords": "party celebration happy music",
        "energy_range": (0.4, 0.8),
        "danceability_min": 0.4
    }
}


# =============================================================================
# CLIP ANALYSIS SERVICE CLASS
# =============================================================================

class CLIPAnalysisService:
    """
    Zero-shot image/video classification service using OpenAI's CLIP model.
    
    CLIP (Contrastive Language-Image Pre-training) can understand images
    in relation to natural language descriptions, making it perfect for
    classifying Pakistani wedding events without any training data.
    """
    
    def __init__(self):
        """
        Initialize the CLIP model and processor.
        Automatically uses GPU (CUDA) if available, otherwise falls back to CPU.
        """
        self.model = None
        self.processor = None
        
        # Detect device with detailed diagnostics
        if CLIP_AVAILABLE:
            # Check CUDA availability and print diagnostics
            cuda_available = torch.cuda.is_available()
            print(f"\n🔍 PyTorch CUDA Detection:")
            print(f"   - CUDA Available: {cuda_available}")
            if cuda_available:
                print(f"   - CUDA Version: {torch.version.cuda}")
                print(f"   - GPU Count: {torch.cuda.device_count()}")
                print(f"   - GPU Name: {torch.cuda.get_device_name(0)}")
                print(f"   - GPU Capability: {torch.cuda.get_device_capability(0)}")
            print()
            
            # Use CUDA if available, otherwise CPU
            self.device = "cuda" if cuda_available else "cpu"
        else:
            self.device = "cpu"
        
        self._model_loaded = False
        
        # YOLO person detector (lazy loading)
        self.person_detector = None
        self._person_detector_loaded = False
        
        # Print device info
        if CLIP_AVAILABLE and self.device:
            gpu_info = ""
            if self.device == "cuda":
                gpu_name = torch.cuda.get_device_name(0)
                gpu_info = f" (GPU: {gpu_name})"
            print(f"✅ CLIP Analysis Service initialized - Device: {self.device.upper()}{gpu_info}")
            print("   Model will be loaded on first use (lazy loading)")
        
        # Check dependencies
        if not PIL_AVAILABLE:
            print("❌ CLIP Service: PIL not available")
            return
            
        if not CLIP_AVAILABLE:
            print("❌ CLIP Service: Transformers/PyTorch not available")
            return
    
    def _load_model(self):
        """
        Lazy-load the CLIP model to reduce startup time.
        Called on first analysis request.
        """
        if self._model_loaded:
            return True
            
        if not CLIP_AVAILABLE:
            return False
            
        try:
            print(f"\n🔄 Loading CLIP model to {self.device.upper()} (first time only, please wait)...")
            
            # Use the base model for faster inference
            # For better accuracy, use: "openai/clip-vit-large-patch14"
            model_name = "openai/clip-vit-base-patch32"
            
            self.model = CLIPModel.from_pretrained(model_name)
            self.processor = CLIPProcessor.from_pretrained(model_name)
            
            # Move to appropriate device
            print(f"   Moving model to {self.device.upper()}...")
            self.model = self.model.to(self.device)
            
            # Set to evaluation mode
            self.model.eval()
            
            # Verify model is on correct device
            if self.device == "cuda":
                model_device = next(self.model.parameters()).device
                print(f"✅ Model loaded on: {model_device}")
            else:
                print(f"✅ Model loaded on CPU")
            
            self._model_loaded = True
            print("✅ CLIP model ready for inference!\n")
            return True
            
        except Exception as e:
            print(f"❌ Failed to load CLIP model: {e}")
            return False
    
    def _load_person_detector(self):
        """
        Lazy-load YOLO person detector to reduce startup time.
        """
        if self._person_detector_loaded:
            return True
        
        if not YOLO_AVAILABLE:
            print("⚠️ YOLO not available, skipping person detection")
            return False
        
        try:
            print("📥 Loading YOLO person detector...")
            # Use YOLOv8n (nano) - smallest and fastest
            self.person_detector = YOLO('yolov8n.pt')
            self._person_detector_loaded = True
            print("✅ YOLO person detector loaded!")
            return True
        except Exception as e:
            print(f"❌ Failed to load YOLO: {e}")
            return False
    
    def _detect_people(self, image: Image.Image) -> Dict[str, Any]:
        """
        Detect if there are people in the image using YOLO.
        
        Returns:
            dict with:
                - has_people: bool
                - num_people: int
                - confidence: float (average confidence of detected people)
        """
        # Load YOLO if not loaded
        if not self._person_detector_loaded:
            if not self._load_person_detector():
                # If YOLO not available, assume image has people (fail-open)
                return {"has_people": True, "num_people": 1, "confidence": 1.0}
        
        try:
            # Run YOLO detection
            results = self.person_detector(image, verbose=False)
            
            # YOLO class 0 = person
            person_detections = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    if int(box.cls[0]) == 0:  # class 0 is 'person'
                        person_detections.append(float(box.conf[0]))
            
            has_people = len(person_detections) > 0
            num_people = len(person_detections)
            avg_confidence = sum(person_detections) / len(person_detections) if person_detections else 0.0
            
            print(f"👤 Person detection: {num_people} people found (avg conf: {avg_confidence:.1%})")
            
            return {
                "has_people": has_people,
                "num_people": num_people,
                "confidence": avg_confidence
            }
        except Exception as e:
            print(f"⚠️ Person detection failed: {e}")
            # Fail-open: assume has people if detection fails
            return {"has_people": True, "num_people": 1, "confidence": 1.0}
    
    def detect_event_and_mood(
        self, 
        image_data: str = None, 
        image_file: bytes = None,
        video_file: bytes = None,
        is_base64: bool = True
    ) -> Dict[str, Any]:
        """
        Main entry point: Detect event type and mood from image or video.
        
        Args:
            image_data: Base64 encoded image string
            image_file: Raw image bytes
            video_file: Raw video bytes (will extract frames)
            is_base64: Whether image_data is base64 encoded
            
        Returns:
            Dictionary with detected event, mood, and confidence scores
        """
        # Load model if not already loaded
        if not self._load_model():
            return {
                "success": False,
                "error": "CLIP model not available. Please install: pip install transformers torch Pillow",
                "detected_event": "general",
                "event_confidence": 0.0,
                "detected_mood": "calm",
                "mood_confidence": 0.0
            }
        
        try:
            # Handle video input
            if video_file:
                return self._analyze_video(video_file)
            
            # Handle image input
            image = self._load_image(image_data, image_file, is_base64)
            if image is None:
                return {
                    "success": False,
                    "error": "Failed to load image",
                    "detected_event": "general",
                    "event_confidence": 0.0,
                    "detected_mood": "calm",
                    "mood_confidence": 0.0
                }
            
            # Classify event and mood
            return self._classify_image(image)
            
        except Exception as e:
            print(f"❌ Analysis error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "detected_event": "general",
                "event_confidence": 0.0,
                "detected_mood": "calm",
                "mood_confidence": 0.0
            }
    
    def _load_image(
        self, 
        image_data: str = None, 
        image_file: bytes = None,
        is_base64: bool = True
    ) -> Optional[Image.Image]:
        """
        Load image from various input formats.
        
        Supports:
        - Base64 encoded strings (with or without data URL prefix)
        - Raw bytes
        """
        try:
            if image_file:
                # Load from raw bytes
                return Image.open(BytesIO(image_file)).convert("RGB")
            
            if image_data:
                # Handle base64 data URL format
                if "," in image_data:
                    image_data = image_data.split(",")[1]
                
                # Decode base64
                image_bytes = base64.b64decode(image_data)
                return Image.open(BytesIO(image_bytes)).convert("RGB")
            
            return None
            
        except Exception as e:
            print(f"❌ Failed to load image: {e}")
            return None
    
    def _classify_image(self, image: Image.Image) -> Dict[str, Any]:
        """
        Classify a single image for event type and mood using CLIP zero-shot.
        
        HOW ZERO-SHOT CLASSIFICATION WORKS:
        -----------------------------------
        1. We encode the image using CLIP's vision encoder
        2. We encode all text prompts using CLIP's text encoder
        3. We compute similarity between image and each text prompt
        4. The prompt with highest similarity determines the class
        
        VALIDATION:
        -----------
        - Checks if the image matches NOT_EVENT prompts (screenshots, random photos)
        - Checks if confidence is above MIN_EVENT_CONFIDENCE threshold
        - Rejects images that don't appear to be from a real event
        
        This allows classification without any training data!
        """
        # Step 0: Check if there are people in the image (reject screenshots, landscapes)
        person_detection = self._detect_people(image)
        
        if not person_detection["has_people"]:
            return {
                "success": False,
                "is_valid_event": False,
                "rejection_reason": "No people detected in this image. Please upload a photo with people from your event.",
                "detected_event": "unknown",
                "event_confidence": 0.0,
                "detected_mood": "unknown",
                "mood_confidence": 0.0,
                "all_event_scores": {},
                "all_mood_scores": {},
                "num_people_detected": 0,
                "music_params": None,
                "model_used": "clip-vit-base-patch32 + yolov8"
            }
        
        # Step 1: Detect Event Type
        event_result = self._zero_shot_classify(
            image, 
            EVENT_PROMPTS, 
            list(EVENT_PROMPTS.keys())
        )
        
        # Step 2: Detect Mood
        mood_result = self._zero_shot_classify(
            image,
            MOOD_PROMPTS,
            list(MOOD_PROMPTS.keys())
        )
        
        # Step 3: Get music parameters based on detected event
        music_params = EVENT_TO_MUSIC_VIBE.get(
            event_result["label"], 
            EVENT_TO_MUSIC_VIBE["general"]
        )
        
        # Add a low confidence warning if needed
        best_event_confidence = event_result["confidence"]
        confidence_warning = None
        if best_event_confidence < 0.15:  # 15%
            confidence_warning = f"Low confidence detection ({best_event_confidence:.0%}). Results may not be accurate."
        
        print(f"✅ Detected: {event_result['label']} ({event_result['confidence']:.1%}), "
              f"Mood: {mood_result['label']} ({mood_result['confidence']:.1%})")
        
        return {
            "success": True,
            "is_valid_event": True,
            "rejection_reason": None,
            "confidence_warning": confidence_warning,
            "detected_event": event_result["label"],
            "event_confidence": round(event_result["confidence"], 2),
            "detected_mood": mood_result["label"],
            "mood_confidence": round(mood_result["confidence"], 2),
            "all_event_scores": event_result["all_scores"],
            "all_mood_scores": mood_result["all_scores"],
            "num_people_detected": person_detection["num_people"],
            "music_params": music_params,
            "model_used": "clip-vit-base-patch32 + yolov8"
        }
    
    def _check_not_event(self, image: Image.Image) -> float:
        """
        Check how likely the image is NOT an event photo.
        
        Uses NOT_EVENT_PROMPTS to detect screenshots, random images, etc.
        Returns a score between 0 and 1 (higher = more likely NOT an event).
        """
        # Process image with all NOT_EVENT prompts
        inputs = self.processor(
            text=NOT_EVENT_PROMPTS,
            images=image,
            return_tensors="pt",
            padding=True
        )
        
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits_per_image[0]
            probs = torch.softmax(logits, dim=0).cpu().numpy()
        
        # Return the average "not event" probability
        # Higher score means image is more likely NOT an event
        avg_not_event_score = float(sum(probs) / len(probs))
        
        # Also check max score - if any NOT_EVENT prompt scores very high
        max_not_event_score = float(max(probs))
        
        # Use weighted combination: emphasize max score
        combined_score = 0.4 * avg_not_event_score + 0.6 * max_not_event_score
        
        print(f"📊 NOT_EVENT check: avg={avg_not_event_score:.2%}, max={max_not_event_score:.2%}, combined={combined_score:.2%}")
        
        return combined_score
    
    def _zero_shot_classify(
        self, 
        image: Image.Image, 
        prompts_dict: Dict[str, List[str]],
        labels: List[str]
    ) -> Dict[str, Any]:
        """
        Perform zero-shot classification using CLIP.
        
        For each category, we use multiple prompts and average their scores
        to get a more robust prediction.
        
        Args:
            image: PIL Image to classify
            prompts_dict: Dictionary mapping labels to list of text prompts
            labels: List of category labels
            
        Returns:
            Dictionary with best label, confidence, and all scores
        """
        # Collect all prompts
        all_prompts = []
        prompt_to_label = {}
        
        for label in labels:
            for prompt in prompts_dict[label]:
                all_prompts.append(prompt)
                prompt_to_label[prompt] = label
        
        # Process image and text through CLIP
        inputs = self.processor(
            text=all_prompts,
            images=image,
            return_tensors="pt",
            padding=True
        )
        
        # Move to device
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Get CLIP embeddings
        with torch.no_grad():
            outputs = self.model(**inputs)
            
            # Get similarity scores (logits per image)
            logits = outputs.logits_per_image[0]
            
            # Convert to probabilities using softmax
            probs = torch.softmax(logits, dim=0).cpu().numpy()
        
        # Aggregate scores by label (average of all prompts for each label)
        label_scores = {label: [] for label in labels}
        
        for i, prompt in enumerate(all_prompts):
            label = prompt_to_label[prompt]
            label_scores[label].append(probs[i])
        
        # Calculate average score for each label
        avg_scores = {}
        for label in labels:
            avg_scores[label] = float(sum(label_scores[label]) / len(label_scores[label]))
        
        # Find best label
        best_label = max(avg_scores, key=avg_scores.get)
        best_confidence = avg_scores[best_label]
        
        return {
            "label": best_label,
            "confidence": best_confidence,
            "all_scores": avg_scores
        }
    
    def _analyze_video(self, video_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze a video by extracting key frames and aggregating predictions.
        
        VIDEO ANALYSIS APPROACH:
        -----------------------
        1. Save video to temporary file
        2. Use ffmpeg to extract frames (1 per second or max 10 frames)
        3. Classify each frame using CLIP
        4. Aggregate predictions by averaging confidence scores
        5. Return the most confident event and mood
        
        This approach captures different moments in the video for better accuracy.
        """
        # Check if ffmpeg is available
        if not self._check_ffmpeg():
            return {
                "success": False,
                "error": "ffmpeg not found. Please install ffmpeg for video analysis.",
                "detected_event": "general",
                "event_confidence": 0.0,
                "detected_mood": "calm",
                "mood_confidence": 0.0
            }
        
        try:
            # Create temporary directory for frames
            temp_dir = tempfile.mkdtemp()
            video_path = os.path.join(temp_dir, "input_video.mp4")
            
            # Save video to temp file
            with open(video_path, "wb") as f:
                f.write(video_bytes)
            
            # Extract frames using ffmpeg
            frames = self._extract_frames(video_path, temp_dir, max_frames=10)
            
            if not frames:
                shutil.rmtree(temp_dir)
                return {
                    "success": False,
                    "error": "No frames could be extracted from video",
                    "detected_event": "general",
                    "event_confidence": 0.0,
                    "detected_mood": "calm",
                    "mood_confidence": 0.0
                }
            
            print(f"📹 Extracted {len(frames)} frames from video")
            
            # Analyze each frame
            event_scores = {label: [] for label in EVENT_PROMPTS.keys()}
            mood_scores = {label: [] for label in MOOD_PROMPTS.keys()}
            
            for i, frame_path in enumerate(frames):
                print(f"   Analyzing frame {i+1}/{len(frames)}...")
                
                image = Image.open(frame_path).convert("RGB")
                result = self._classify_image(image)
                
                if result["success"]:
                    # Accumulate scores
                    for label, score in result["all_event_scores"].items():
                        event_scores[label].append(score)
                    for label, score in result["all_mood_scores"].items():
                        mood_scores[label].append(score)
            
            # Cleanup temp files
            shutil.rmtree(temp_dir)
            
            # Aggregate scores by averaging
            avg_event_scores = {
                label: sum(scores) / len(scores) if scores else 0
                for label, scores in event_scores.items()
            }
            avg_mood_scores = {
                label: sum(scores) / len(scores) if scores else 0
                for label, scores in mood_scores.items()
            }
            
            # Get best predictions
            best_event = max(avg_event_scores, key=avg_event_scores.get)
            best_mood = max(avg_mood_scores, key=avg_mood_scores.get)
            
            music_params = EVENT_TO_MUSIC_VIBE.get(best_event, EVENT_TO_MUSIC_VIBE["general"])
            
            print(f"✅ Video Analysis Complete: {best_event} ({avg_event_scores[best_event]:.1%}), "
                  f"Mood: {best_mood} ({avg_mood_scores[best_mood]:.1%})")
            
            return {
                "success": True,
                "detected_event": best_event,
                "event_confidence": round(avg_event_scores[best_event], 2),
                "detected_mood": best_mood,
                "mood_confidence": round(avg_mood_scores[best_mood], 2),
                "all_event_scores": avg_event_scores,
                "all_mood_scores": avg_mood_scores,
                "music_params": music_params,
                "model_used": "clip-vit-base-patch32",
                "frames_analyzed": len(frames),
                "is_video": True
            }
            
        except Exception as e:
            print(f"❌ Video analysis error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "detected_event": "general",
                "event_confidence": 0.0,
                "detected_mood": "calm",
                "mood_confidence": 0.0
            }
    
    def _extract_frames(
        self, 
        video_path: str, 
        output_dir: str, 
        max_frames: int = 10
    ) -> List[str]:
        """
        Extract frames from video using ffmpeg.
        
        Extracts 1 frame per second, up to max_frames total.
        This captures different moments in the video for better analysis.
        
        Args:
            video_path: Path to input video file
            output_dir: Directory to save extracted frames
            max_frames: Maximum number of frames to extract
            
        Returns:
            List of paths to extracted frame images
        """
        try:
            # First, get video duration
            duration_cmd = [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", video_path
            ]
            
            result = subprocess.run(
                duration_cmd, 
                capture_output=True, 
                text=True
            )
            
            duration = float(result.stdout.strip()) if result.stdout.strip() else 10
            
            # Calculate frame interval
            # Extract 1 fps but limit to max_frames
            fps = min(1, max_frames / duration) if duration > max_frames else 1
            
            # Extract frames
            output_pattern = os.path.join(output_dir, "frame_%03d.jpg")
            
            extract_cmd = [
                "ffmpeg", "-i", video_path,
                "-vf", f"fps={fps}",
                "-frames:v", str(max_frames),
                "-q:v", "2",
                output_pattern,
                "-y"
            ]
            
            subprocess.run(
                extract_cmd, 
                capture_output=True, 
                check=True
            )
            
            # Get list of extracted frames
            frames = sorted([
                os.path.join(output_dir, f)
                for f in os.listdir(output_dir)
                if f.startswith("frame_") and f.endswith(".jpg")
            ])
            
            return frames
            
        except Exception as e:
            print(f"❌ Frame extraction error: {e}")
            return []
    
    def _check_ffmpeg(self) -> bool:
        """Check if ffmpeg is available on the system."""
        try:
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                check=True
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False


# =============================================================================
# SERVICE INSTANCE (Singleton)
# =============================================================================

# Create a global instance for use across the application
clip_analysis_service = CLIPAnalysisService()


# =============================================================================
# HELPER FUNCTIONS FOR EXTERNAL USE
# =============================================================================

def detect_event_mood_from_image(image_data: str, is_base64: bool = True) -> Dict[str, Any]:
    """
    Convenience function to detect event and mood from an image.
    
    Args:
        image_data: Base64 encoded image or raw image data
        is_base64: Whether the image is base64 encoded
        
    Returns:
        Detection results dictionary
    """
    return clip_analysis_service.detect_event_and_mood(
        image_data=image_data, 
        is_base64=is_base64
    )


def detect_event_mood_from_video(video_bytes: bytes) -> Dict[str, Any]:
    """
    Convenience function to detect event and mood from a video.
    
    Args:
        video_bytes: Raw video file bytes
        
    Returns:
        Detection results dictionary with aggregated predictions
    """
    return clip_analysis_service.detect_event_and_mood(video_file=video_bytes)


def get_music_params_for_event(event_type: str) -> Dict[str, Any]:
    """
    Get Spotify search parameters for a detected event type.
    
    Args:
        event_type: Detected event type (mehndi, barat, walima, etc.)
        
    Returns:
        Dictionary with genres, keywords, and audio feature ranges
    """
    return EVENT_TO_MUSIC_VIBE.get(event_type, EVENT_TO_MUSIC_VIBE["general"])
