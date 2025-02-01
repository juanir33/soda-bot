export default () => ({
  port: parseInt(process.env?.PORT || '3003', 10),
});
