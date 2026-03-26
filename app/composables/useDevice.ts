export const useDevice = () => {
  const isMobile = ref(false);

  const checkMobile = () => {
    if (typeof window === 'undefined') return;
    
    const ua = navigator.userAgent;
    const isUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isWidth = window.innerWidth <= 768;
    
    isMobile.value = isUA || isWidth;
  };

  onMounted(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile);
  });

  return {
    isMobile
  };
};
