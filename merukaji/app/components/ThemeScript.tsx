'use client';

export function ThemeScript() {
  const themeScript = `
    (function() {
      // Use a single mechanism for theme detection
      const storedTheme = localStorage.getItem('merukaji-theme');
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
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