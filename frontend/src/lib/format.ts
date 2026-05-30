/**
 * 业务意义：把接口时间字符串格式化为本地日期时间。
 * 参数：`value?` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
/**
 * 格式化工具模块，负责日期、时间和技术栈字符串转换。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

/**
 * 业务意义：把接口日期字符串格式化为本地日期。
 * 参数：`value?` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
export function formatDate(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

/**
 * 业务意义：把技术栈输入字符串拆成数组字段。
 * 参数：`value` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
export function splitTechStack(value: string) {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 业务意义：把技术栈数组合并为表单展示字符串。
 * 参数：`value?` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
export function joinTechStack(value?: string[]) {
  return (value ?? []).join(", ");
}
