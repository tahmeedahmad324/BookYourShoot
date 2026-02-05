import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to persist form data in localStorage
 * Automatically saves and restores form values
 * 
 * @param {string} formKey - Unique identifier for the form (e.g., 'register-form')
 * @param {object} formValues - Current form values from react-hook-form watch()
 * @param {function} setValue - setValue function from react-hook-form
 * @param {array} fieldsToSave - Array of field names to persist (optional, defaults to all)
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 500)
 */
const useFormPersistence = (formKey, formValues, setValue, fieldsToSave = null, debounceMs = 500) => {
  const storageKey = `form_data_${formKey}`;
  const isRestoredRef = useRef(false);
  const fieldsToSaveRef = useRef(fieldsToSave);

  // Load saved form data on mount (only once)
  useEffect(() => {
    if (isRestoredRef.current) return;
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Restore each saved field
        Object.keys(parsedData).forEach(fieldName => {
          // Only restore if we're tracking this field
          if (!fieldsToSaveRef.current || fieldsToSaveRef.current.includes(fieldName)) {
            setValue(fieldName, parsedData[fieldName], { shouldValidate: false });
          }
        });
      }
      isRestoredRef.current = true;
    } catch (error) {
      console.error('Error loading form data from localStorage:', error);
      isRestoredRef.current = true;
    }
  }, [storageKey, setValue]);

  // Save form data with debouncing (only after restoration is complete)
  useEffect(() => {
    if (!isRestoredRef.current) return;
    
    const timeoutId = setTimeout(() => {
      try {
        // Filter values to save
        const dataToSave = fieldsToSaveRef.current 
          ? Object.keys(formValues)
              .filter(key => fieldsToSaveRef.current.includes(key) && formValues[key])
              .reduce((obj, key) => {
                obj[key] = formValues[key];
                return obj;
              }, {})
          : Object.keys(formValues).reduce((obj, key) => {
              if (formValues[key]) {
                obj[key] = formValues[key];
              }
              return obj;
            }, {});

        // Only save if there's actual data with values
        if (Object.keys(dataToSave).length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        }
      } catch (error) {
        console.error('Error saving form data to localStorage:', error);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [formValues, storageKey, debounceMs]);

  // Function to clear saved data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing form data from localStorage:', error);
    }
  }, [storageKey]);

  return { clearSavedData };
};

export default useFormPersistence;
