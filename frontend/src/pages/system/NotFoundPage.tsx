import { Link } from "react-router-dom";

import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";

export function NotFoundPage() {
  return (
    <PageHeader
      title="页面不存在"
      description="请从左侧菜单重新进入需要的页面。"
      actions={
        <Link to="/dashboard">
          <Button variant="secondary">返回看板</Button>
        </Link>
      }
    />
  );
}
