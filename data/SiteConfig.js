const config = {
  siteTitle: 'Arbaz Siddiqui',
  siteTitleShort: 'Arbaz Siddiqui',
  siteTitleAlt: 'Arbaz Siddiqui',
  siteLogo: '/logos/logo-1024.png',
  siteUrl: 'https://www.arbazsiddiqui.me',
  repo: 'https://github.com/arbazsiddiqui/blog',
  pathPrefix: '',
  dateFromFormat: 'YYYY-MM-DD',
  dateFormat: 'MMMM Do, YYYY',
  siteDescription:
    'Arbaz Siddiqui is a full stack software developer specializing in system design and distributing computing.',
  siteRss: '/rss.xml',
  googleAnalyticsID: 'UA-79508594-2',
  postDefaultCategoryID: 'Tech',
  userEmail: 'arbaz00@gmail.com',
  userTwitter: 'arbazsiddiqui_',
  menuLinks: [
    {
      name: 'Articles',
      link: '/blog/',
    },
	  {
		  name: 'Projects',
		  link: '/projects/',
	  },
	  {
		  name: 'About',
		  link: '/me/',
	  }
  ],
  themeColor: '#1f1f1f', // Used for setting manifest and progress theme colors.
  backgroundColor: '#ffffff',
}

// Make sure pathPrefix is empty if not needed
if (config.pathPrefix === '/') {
  config.pathPrefix = ''
} else {
  // Make sure pathPrefix only contains the first forward slash
  config.pathPrefix = `/${config.pathPrefix.replace(/^\/|\/$/g, '')}`
}

// Make sure siteUrl doesn't have an ending forward slash
if (config.siteUrl.substr(-1) === '/') config.siteUrl = config.siteUrl.slice(0, -1)

// Make sure siteRss has a starting forward slash
if (config.siteRss && config.siteRss[0] !== '/') config.siteRss = `/${config.siteRss}`

module.exports = config
