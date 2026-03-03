import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import { createProject, listProjects } from "../lib/projectStorage";

function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(() => listProjects());

  const hasProjects = useMemo(() => projects.length > 0, [projects.length]);

  const handleCreateProject = () => {
    const project = createProject();
    setProjects(listProjects());
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="home-layout">
      <HomeHeader onCreateProject={handleCreateProject} />
      <main className="project-list-main home-main">
        <div className="project-list-page">
          <h2>프로젝트 목록</h2>
          <p className="panel-help">프로젝트를 선택하면 해당 프로젝트 주소로 이동합니다.</p>
          {!hasProjects ? (
            <div className="empty-project-box">아직 프로젝트가 없습니다. 상단에서 새 프로젝트를 만들어 주세요.</div>
          ) : (
            <div className="project-card-grid">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="project-card"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <strong>{project.title || "Untitled Project"}</strong>
                  <span>{project.updatedAt || "방금"}</span>
                  <code className="project-card-link">/projects/{project.id}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default HomePage;
