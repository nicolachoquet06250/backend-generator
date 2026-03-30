export const useSettings = () => {
  const isCompact = useState<boolean>('settings-is-compact', () => false);

  onMounted(() => {
    if (import.meta.client) {
      const savedCompact = localStorage.getItem('settings-is-compact');
      if (savedCompact !== null) {
        isCompact.value = savedCompact === 'true';
      }
    }
  });

  watch(isCompact, (newValue) => {
    if (import.meta.client) {
      localStorage.setItem('settings-is-compact', newValue.toString());
    }
  });

  const toggleCompact = () => {
    isCompact.value = !isCompact.value;
  };

  return {
    isCompact,
    toggleCompact
  };
};
