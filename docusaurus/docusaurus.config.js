const { themes: prismThemes } = require("prism-react-renderer");

module.exports = {
  title: "WealthVN Documentation",
  tagline: "Internal Developer Documentation for WealthVN",
  favicon: "img/favicon.ico",
  url: "https://chipheo00.github.io",
  baseUrl: "/wealth-vn/",
  organizationName: "chipheo00",
  projectName: "vn-wealthfolio",
  trailingSlash: false,
  deploymentBranch: "gh-pages",
  onBrokenLinks: "ignore",
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "ignore",
    },
  },
  themes: ["@docusaurus/theme-mermaid"],
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: "./sidebars.js",
          editUrl: "https://github.com/chipheo00/vn-wealthfolio/tree/main/docs/",
          routeBasePath: "/docs",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      },
    ],
  ],
  themeConfig: {
    image: "img/social-card.png",
    navbar: {
      title: "WealthVN",
      logo: {
        alt: "WealthVN Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          to: "/",
          label: "Trang Chủ",
          position: "left",
          activeBaseRegex: "^/$",
        },
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          label: "Tài Liệu",
          position: "left",
        },
        {
          href: "https://github.com/chipheo00/vn-wealthfolio",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Getting Started",
              to: "/intro",
            },
            {
              label: "Development",
              to: "/development/overview",
            },
            {
              label: "API Reference",
              to: "/api/overview",
            },
          ],
        },
        {
          title: "Resources",
          items: [
            {
              label: "GitHub Repository",
              href: "https://github.com/chipheo00/vn-wealthfolio",
            },
            {
              label: "Issues & Discussions",
              href: "https://github.com/chipheo00/vn-wealthfolio/issues",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} WealthVN. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["rust", "typescript", "bash", "json", "sql"],
    },
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  },
};
