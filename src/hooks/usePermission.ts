import { useState, useCallback, useEffect } from 'react';

type PermissionState = 'prompt' | 'granted' | 'denied' | 'custom-prompt';

export const useCameraPermission = () => {
  const [status, setStatus] = useState<PermissionState>('prompt');
  const [showDialog, setShowDialog] = useState(false);

  const checkPermission = useCallback(async () => {
    // 1. Check local storage first (our custom persistent state)
    const storedStatus = localStorage.getItem('camera_permission_granted');
    if (storedStatus === 'true') {
      setStatus('granted');
      return 'granted';
    }

    // 2. Check browser Permissions API if available
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (result.state === 'granted') {
          localStorage.setItem('camera_permission_granted', 'true');
          setStatus('granted');
          return 'granted';
        } else if (result.state === 'denied') {
          setStatus('denied');
          return 'denied';
        }
      }
    } catch (e) {
      console.warn('Permissions API not supported or failed', e);
    }

    setStatus('prompt');
    return 'prompt';
  }, []);

  const requestPermission = useCallback(async () => {
    // If already granted, just return true
    if (status === 'granted') return true;

    // Show our custom dialog first
    setShowDialog(true);
    return false; // Permission not yet granted, waiting for dialog
  }, [status]);

  const handleAllow = useCallback(async () => {
    setShowDialog(false);
    try {
      // Trigger the real browser permission request
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // If successful, stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      localStorage.setItem('camera_permission_granted', 'true');
      setStatus('granted');
      return true;
    } catch (err: any) {
      console.error('Camera permission request failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
      }
      return false;
    }
  }, []);

  const handleDeny = useCallback(() => {
    setShowDialog(false);
    setStatus('prompt'); // Let them try again later
  }, []);

  return {
    status,
    showDialog,
    requestPermission,
    handleAllow,
    handleDeny,
    setShowDialog
  };
};
