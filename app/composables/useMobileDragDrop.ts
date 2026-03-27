import { ref } from 'vue';

export const useMobileDragDrop = () => {
  const isDragging = ref(false);
  const draggedElement = ref<HTMLElement | null>(null);
  const dragImage = ref<HTMLElement | null>(null);
  const dragData = ref<Record<string, string>>({});
  const lastTarget = ref<Element | null>(null);

  const onTouchStart = (e: TouchEvent, data: Record<string, string>) => {
    const target = e.currentTarget as HTMLElement;
    draggedElement.value = target;
    dragData.value = data;

    // Create drag image
    dragImage.value = target.cloneNode(true) as HTMLElement;
    dragImage.value.style.position = 'fixed';
    dragImage.value.style.zIndex = '10001';
    dragImage.value.style.pointerEvents = 'none';
    dragImage.value.style.opacity = '0.7';
    dragImage.value.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
    dragImage.value.style.transition = 'none';
    dragImage.value.style.transform = 'scale(0.8)'; // Slightly smaller for better visibility
    
    const touch = e.touches[0];
    updateDragImagePosition(touch!.clientX, touch!.clientY);
    
    document.body.appendChild(dragImage.value);
    isDragging.value = true;

    // Trigger a custom event for "dragstart"
    const dragStartEvent = new CustomEvent('mobile-dragstart', {
      detail: { dataTransfer: { setData: (type: string, val: string) => { dragData.value[type] = val; } } }
    });
    target.dispatchEvent(dragStartEvent);
  };

  const updateDragImagePosition = (x: number, y: number) => {
    if (dragImage.value) {
      // Center the drag image on the touch point
      // On utilise un offset pour que le doigt soit légèrement en-dessous du centre
      // Cela permet de mieux voir ce qu'on survole
      const rect = draggedElement.value?.getBoundingClientRect();
      const width = rect?.width || 0;
      const height = rect?.height || 0;
      dragImage.value.style.left = `${x - width / 2}px`;
      dragImage.value.style.top = `${y - height - 10}px`; // Décalage vers le haut pour libérer la vue sous le doigt
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging.value || !dragImage.value) return;
    
    const touch = e.touches[0];
    updateDragImagePosition(touch!.clientX, touch!.clientY);

    // Find element under touch
    // On s'assure que le dragImage n'est pas détecté par pointer events: none (déjà configuré lors du start)
    // Mais elementFromPoint ne détecte pas les éléments avec pointer events: none par défaut
    // sauf sur certains navigateurs si le parent l'autorise.
    
    // On cherche l'élément cible
    // On cache temporairement le dragImage pour identifier l'élément en-dessous
    // C'est la méthode la plus fiable, car pointer events : none n'est pas toujours respecté par elementFromPoint
    // selon le navigateur et le contexte.
    const oldDisplay = dragImage.value.style.display;
    dragImage.value.style.display = 'none';
    const target = document.elementFromPoint(touch!.clientX, touch!.clientY);
    dragImage.value.style.display = oldDisplay;

    if (target !== lastTarget.value) {
      if (lastTarget.value) {
        const dragLeaveEvent = new CustomEvent('mobile-dragleave', {
          bubbles: true,
          cancelable: true,
          detail: { 
            clientX: touch!.clientX,
            clientY: touch!.clientY,
            dataTransfer: { 
              types: Object.keys(dragData.value),
              getData: (type: string) => dragData.value[type]
            }
          }
        });
        lastTarget.value.dispatchEvent(dragLeaveEvent);
      }
      lastTarget.value = target;
    }

    if (target) {
      const dragOverEvent = new CustomEvent('mobile-dragover', {
        bubbles: true,
        cancelable: true,
        detail: { 
          clientX: touch!.clientX,
          clientY: touch!.clientY,
          dataTransfer: { 
            types: Object.keys(dragData.value),
            getData: (type: string) => dragData.value[type]
          }
        }
      });
      target.dispatchEvent(dragOverEvent);
    }
    
    // Auto-scroll logic
    const scrollThreshold = 100; // pixels from edge to start scrolling
    const scrollSpeed = 10;
    
    if (touch!.clientY < scrollThreshold) {
      // Prioritize scrolling the scrollable container first
      const scrollableParent = findScrollableParent(draggedElement.value);
      if (scrollableParent && scrollableParent.scrollTop > 0) {
        scrollableParent.scrollBy(0, -scrollSpeed);
      } else {
        window.scrollBy(0, -scrollSpeed);
      }
    } else if (touch!.clientY > window.innerHeight - scrollThreshold) {
      const scrollableParent = findScrollableParent(draggedElement.value);
      if (scrollableParent && (scrollableParent.scrollTop + scrollableParent.clientHeight < scrollableParent.scrollHeight)) {
        scrollableParent.scrollBy(0, scrollSpeed);
      } else {
        window.scrollBy(0, scrollSpeed);
      }
    }

    // Empêcher le défilement de la page par défaut pendant le drag et drop
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const findScrollableParent = (el: HTMLElement | null): HTMLElement | null => {
    if (!el) return null;
    let parent = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflow + style.overflowY)) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!isDragging.value) return;

    const touch = e.changedTouches[0];
    
    if (dragImage.value) {
      // On cache temporairement le dragImage pour identifier l'élément en-dessous
      const oldDisplay = dragImage.value.style.display;
      dragImage.value.style.display = 'none';
      const target = document.elementFromPoint(touch!.clientX, touch!.clientY);
      dragImage.value.style.display = oldDisplay;
      
      if (lastTarget.value) {
        const dragLeaveEvent = new CustomEvent('mobile-dragleave', {
          bubbles: true,
          cancelable: true,
          detail: { 
            dataTransfer: { 
              getData: (type: string) => dragData.value[type],
              types: Object.keys(dragData.value)
            } 
          }
        });
        lastTarget.value.dispatchEvent(dragLeaveEvent);
      }
      
      document.body.removeChild(dragImage.value);
      dragImage.value = null;

      if (target) {
        const dropEvent = new CustomEvent('mobile-drop', {
          bubbles: true,
          cancelable: true,
          detail: { 
            dataTransfer: { 
              getData: (type: string) => dragData.value[type],
              types: Object.keys(dragData.value)
            } 
          }
        });
        target.dispatchEvent(dropEvent);
      }
    }

    isDragging.value = false;
    draggedElement.value = null;
    dragData.value = {};
    lastTarget.value = null;
  };

  return {
    isDragging,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};
