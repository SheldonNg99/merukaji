'use client';

export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        // Check for the user's stored preference
        const storedTheme = localStorage.getItem('merukaji-theme');
        
        // If no preference is stored OR the stored value is 'light', ensure light mode
        if (!storedTheme || storedTheme === 'light') {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('merukaji-theme', 'light');
        } 
        // If dark mode is explicitly stored, apply it
        else if (storedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        }
        // Also ensure the unified theming
        localStorage.setItem('theme', localStorage.getItem('merukaji-theme'));
      } catch (e) {
        // Fallback to light mode if localStorage fails
        document.documentElement.classList.remove('dark');
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