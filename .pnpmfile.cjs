// pnpm 配置文件（可选）
// 如果需要自定义依赖解析，可以在这里配置

function readPackage(pkg, context) {
  // 可以在这里修改包的依赖关系
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
