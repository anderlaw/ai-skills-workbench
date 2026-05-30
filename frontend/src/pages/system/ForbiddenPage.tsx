import { Link } from "react-router-dom";

import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";

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
