'use client';

export function ThemeScript() {
    const themeScript = `
    (function() {
      try {
        // Use a single storage key for consistency
        const storedTheme = localStorage.getItem('merukaji-theme');
        
        // If theme is in localStorage, apply it immediately
        if (storedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        // Clean up any conflicting theme storage
        if (localStorage.getItem('theme') !== storedTheme) {
          localStorage.setItem('theme', storedTheme || 'light');
        }
      } catch (e) {
        console.error('Failed to apply theme:', e);
      }
    })()
  `;

    return (
        <script
            dangerouslySetInnerHTML={{ __html: themeScript }}
            suppressHydrationWarning
        />
    );
}