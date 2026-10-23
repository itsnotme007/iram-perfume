(function (root) {
  var CFG = {
    name: 'IRAM Perfume',
    base: 'https://iramperfume.in',
    phoneDisplay: '+91 93555 33509',
    phoneTel: '+919355533509',
    email: 'perfumeiram@gmail.com',
    whatsappCommunity: 'https://chat.whatsapp.com/JSWEIoCsFd96wzlRAeaewe',
    freeShipMin: 999,
    freeShipMinQty: 2,
    shippingFlat: 100
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CFG;
  else root.IRAM_CONFIG = CFG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
