import React from "react";
import Button from "../ui/Button";

function HomeHeader({ onCreateProject }) {
  return (
    <header className="home-header">
      <div className="home-header-brand">HiddenTube</div>
      <Button onClick={onCreateProject}>새 프로젝트 만들기</Button>
    </header>
  );
}

export default HomeHeader;
