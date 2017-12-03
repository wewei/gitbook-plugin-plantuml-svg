module.exports = {
  OUTPUT_TEMPLATE: str =>
    `<object data="data:image/svg+xml;base64,${str}" type="image/svg+xml"></object>`,
  SERVICE_URL: 'https://plantuml-service.herokuapp.com/svg',
};
