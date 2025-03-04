// Font loading verification utility
window.addEventListener('DOMContentLoaded', () => {
  console.log('Checking font loading...');
  
  // List all loaded fonts for debugging
  const fontFamilies = [];
  document.fonts.forEach((font) => {
    fontFamilies.push(\ - \ - \);
  });
  
  console.log('Available fonts:', [...new Set(fontFamilies)]);
  
  // Test specific fonts
  const testFonts = ['Bruno Ace SC', 'VT323', 'Roboto'];
  testFonts.forEach(font => {
    document.fonts.check(12px "\") 
      ? console.log(? Font "\" loaded successfully) 
      : console.warn(? Font "\" failed to load);
  });
});
