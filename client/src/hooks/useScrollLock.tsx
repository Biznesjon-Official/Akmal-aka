import { useEffect } from 'react';

/**
 * Modal ochilganda body scroll'ni to'xtatish uchun hook
 * Eng kuchli va ishonchli yechim
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    // Hozirgi scroll pozitsiyasini saqlash
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    
    // Original style'larni saqlash
    const originalBodyOverflow = body.style.overflow;
    const originalBodyPosition = body.style.position;
    const originalBodyTop = body.style.top;
    const originalBodyWidth = body.style.width;
    const originalHtmlOverflow = html.style.overflow;
    
    // Body'ni fix qilish va scroll'ni to'xtatish
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.left = '0';
    body.style.right = '0';
    
    // HTML'ni ham bloklash
    html.style.overflow = 'hidden';
    
    // Cleanup - modal yopilganda
    return () => {
      // Style'larni qaytarish
      body.style.overflow = originalBodyOverflow;
      body.style.position = originalBodyPosition;
      body.style.top = originalBodyTop;
      body.style.width = originalBodyWidth;
      body.style.left = '';
      body.style.right = '';
      
      html.style.overflow = originalHtmlOverflow;
      
      // Scroll pozitsiyasini tiklash
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
