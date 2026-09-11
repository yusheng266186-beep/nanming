// 发布包读取与展示数据派生已抽到共享包 @nanhang/release-loader。
//
// 抽出的原因：项目现在有两套前端（apps/web 与 apps/web-paper）。发布包的线格式只有一处实现，
// 才能保证两套前端对同一份数据给出同样的解读——尤其是「哪一年可比」「位次取哪张表」这类
// 一旦分叉就会产生错误结论的判断。
//
// 这个文件保留为薄重导出，既有的导入路径（./release-loader.js）与测试不必改动。
export * from "@nanhang/release-loader";
