import React, { Component } from 'react'
import GitHubButton from 'react-github-btn'

export default class ProjectListing extends Component {
  render() {
    const { projects } = this.props
	  const colormap = {
    	'javascript' : '#f1e05a',
		  'golang' : '#00ADD8',
		  'python' : '#3572A5'
	  };

    return (
      <section className="projects">
        {projects.map(project => (
          <div className="each" key={project.title}>
            <h2>
              <a
                className="project-link"
                href={project.source}
                target="_blank"
                rel="noopener noreferrer"
                style={{color : colormap[project.language] }}
              >
                <div className="project-title">{project.title}</div>
              </a>
            </h2>
            <p>{project.description}</p>
            <div className="buttons">
              <GitHubButton href={project.source} data-size="large" data-show-count="true">
                Stars
              </GitHubButton>
              {project.path && (
                <a className="button" href={project.path} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              )}
            </div>
          </div>
        ))}
      </section>
    )
  }
}
