module.exports = {
  url: process.env.URL || 'https://gurden.xyz/',
  siteName: 'gurden.xyz',
  siteDescription:
    'Gurden’s work portfolio',
  siteType: 'Person', // schema
  locale: 'en_EN',
  lang: 'en',
  skipContent: 'Skip to content',
  author: 'Gurden Batra',
  authorEmail: 'gurden.batra@proton.me',
  authorWebsite: 'https://gurden.xyz',
  themeColor: '#DD4462', //  Manifest: defines the default theme color for the application
  themeBgColor: '#F3F3F3', // Manifest: defines a placeholder background color for the application page to display before its stylesheet is loaded
  meta_data: {
    opengraph_default: '/assets/images/opengraph-default.jpg', // fallback/default meta image
    opengraph_default_alt:
      'Visible content: Gurden’s work portfolio', // alt text for default meta image
    twitterSite: '', // i.e. @site - twitter profile of the site
    twitterCreator: '', // i.e. @author -  twitter profile of the site
    mastodonProfile: '' // i.e. https://front-end.social/@lene - url to your mastodon instance/profile
  },
  blog: {
    // this is for the rss feed
    name: 'Gurden’s blog',
    description:
      'Gurden’s work portfolio'
  },
  pagination: {
    itemsPerPage: 20
  },
  address: {
    // edit all presets or leave empty. They are being used in the pages for privacy.md and imprint.md
    firma: '',
    street: '',
    city: 'Berlin',
    state: '',
    zip: '12047',
    mobileDisplay: '',
    mobileCall: '',
    email: 'gurden.batra@gmail.com',
    cif: ''
  },
  menu: {
    closedText: 'Menu'
  }
};
