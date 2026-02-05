import { useEffect, useCallback } from 'react';

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

  // Load saved form data on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Restore each saved field
        Object.keys(parsedData).forEach(fieldName => {
          // Only restore if we're tracking this field
          if (!fieldsToSave || fieldsToSave.includes(fieldName)) {
            setValue(fieldName, parsedData[fieldName], { shouldValidate: false });
          }
        });
      }
    } catch (error) {
      console.error('Error loading form data from localStorage:', error);
    }
  }, [storageKey, setValue, fieldsToSave]);

  // Save form data with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        // Filter values to save
        const dataToSave = fieldsToSave 
          ? Object.keys(formValues)
              .filter(key => fieldsToSave.includes(key))
              .reduce((obj, key) => {
                obj[key] = formValues[key];
                return obj;
              }, {})
          : formValues;

        // Only save if there's actual data
        if (Object.keys(dataToSave).length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        }
      } catch (error) {
        console.error('Error saving form data to localStorage:', error);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [formValues, storageKey, fieldsToSave, debounceMs]);

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
