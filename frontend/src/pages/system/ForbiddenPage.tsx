/**
 * 无权访问页面模块，提示当前账号缺少菜单权限。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { Link } from "react-router-dom";

import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function ForbiddenPage() {
  return (
    <PageHeader
      title="无权访问"
      description="当前账号没有访问该页面的菜单权限。"
      actions={
        <Link to="/dashboard">
          <Button variant="secondary">返回看板</Button>
        </Link>
      }
    />
  );
}
