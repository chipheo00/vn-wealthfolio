import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import { useState } from 'react';

function HeroSection() {
  const { siteConfig } = useDocusaurusContext();
  const baseUrl = siteConfig.baseUrl;

  return (
    <section className="hero-section">
      <div className="hero-background">
        <div className="hero-gradient"></div>
        <div className="hero-pattern"></div>
      </div>
      <div className="hero-container">
        <div className="hero-text">
          <div className="hero-badge">
            <span className="badge-icon">🚀</span>
            <span>Personal Finance Made Simple</span>
          </div>
          <h1 className="hero-title">
            <span className="title-gradient">WealthVN</span>
            <br />
            <span className="title-subtitle">Quản Lý Tài Chính Cá Nhân Chuyên Nghiệp</span>
          </h1>
          <p className="hero-description">
            Ứng dụng desktop mạnh mẽ giúp bạn theo dõi danh mục đầu tư,
            quản lý tài sản và đạt được mục tiêu tài chính một cách dễ dàng.
            Với WealthVN, mọi dữ liệu đều được lưu ở máy của bạn, không cần
            kết nối internet hay lo lắng về bảo mật thông tin. Dữ liệu về tài sản trên thị trường Việt Nam đầy đủ cổ phiếu, trái phiếu, chứng chỉ quỹ, vàng, và cả tài sản mã hóa.
          </p>
          <div className="hero-buttons">
            <Link className="btn btn-primary" to="https://github.com/chipheo00/vn-wealthfolio/releases">
              <span>⬇️</span> Tải Xuống Ngay
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Miễn Phí</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">🔒</span>
              <span className="stat-label">An Toàn</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">🌐</span>
              <span className="stat-label">Đa Ngôn Ngữ</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">🇻🇳</span>
              <span className="stat-label">Dữ liệu Việt Nam</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-card card-1">
            <div className="hero-window-header">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <img src={`${baseUrl}img/screenshot-dashboard.png`} alt="Dashboard" />
          </div>
          <div className="hero-image-card card-2">
            <div className="hero-window-header">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <img src={`${baseUrl}img/screenshot-holdings.png`} alt="Holdings" />
          </div>
          <div className="hero-image-card card-3">
            <div className="hero-window-header">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <img src={`${baseUrl}img/screenshot-vn-market.png`} alt="Vietnam Market" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: '📈',
      title: 'Theo Dõi Danh Mục',
      description: 'Xem tổng quan toàn bộ tài sản, cổ phiếu, quỹ đầu tư và tiền mặt của bạn trong một giao diện thống nhất.',
    },
    {
      icon: '🎯',
      title: 'Mục Tiêu Tài Chính',
      description: 'Thiết lập và theo dõi tiến trình đạt được các mục tiêu tài chính như mua nhà, du lịch, nghỉ hưu.',
    },
    {
      icon: '📊',
      title: 'Phân Tích Chi Tiết',
      description: 'Biểu đồ và báo cáo chi tiết về hiệu suất đầu tư, phân bổ tài sản và lịch sử giao dịch.',
    },
    {
      icon: '💰',
      title: 'Thu Nhập & Cổ Tức',
      description: 'Theo dõi thu nhập từ cổ tức, lãi suất và các nguồn thu nhập thụ động khác.',
    },
    {
      icon: '🔐',
      title: 'Bảo Mật Tuyệt Đối',
      description: 'Dữ liệu được lưu trữ cục bộ trên máy của bạn. Không có server, không có rủi ro rò rỉ dữ liệu.',
    },
    {
      icon: '🌐',
      title: 'Đa Tiền Tệ',
      description: 'Hỗ trợ nhiều loại tiền tệ, tự động cập nhật tỷ giá và chuyển đổi sang tiền tệ gốc.',
    },
  ];

  return (
    <section className="features-section">
      <div className="section-header">
        <span className="section-badge">Tính Năng</span>
        <h2 className="section-title">Mọi Thứ Bạn Cần</h2>
        <p className="section-description">
          Công cụ toàn diện cho việc quản lý tài chính cá nhân
        </p>
      </div>
      <div className="features-grid">
        {features.map((feature, idx) => (
          <FeatureCard key={idx} {...feature} />
        ))}
      </div>
    </section>
  );
}

function ScreenshotSection() {
  const { siteConfig } = useDocusaurusContext();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const baseUrl = siteConfig.baseUrl;

  const screenshots = [
    {
      src: `${baseUrl}img/screenshot-dashboard.png`,
      title: 'Tổng Quan Tài Sản',
      description: 'Theo dõi toàn bộ danh mục đầu tư với biểu đồ tăng trưởng và các tài khoản',
    },
    {
      src: `${baseUrl}img/screenshot-holdings.png`,
      title: 'Phân Bổ Danh Mục',
      description: 'Xem chi tiết phân bổ theo tiền tệ, tài khoản, tài sản và quốc gia',
    },
    {
      src: `${baseUrl}img/screenshot-performance.png`,
      title: 'Hiệu Suất Đầu Tư',
      description: 'So sánh hiệu suất các tài khoản với chỉ số thị trường VN-Index',
    },
    {
      src: `${baseUrl}img/screenshot-goals.png`,
      title: 'Mục Tiêu Tài Chính',
      description: 'Thiết lập và theo dõi tiến trình đạt được các mục tiêu tài chính',
    },
    {
      src: `${baseUrl}img/screenshot-settings.png`,
      title: 'Tùy Chỉnh Giao Diện',
      description: 'Chọn theme, font và màu sắc theo sở thích cá nhân',
    },
    {
      src: `${baseUrl}img/screenshot-vn-market.png`,
      title: 'Dữ Liệu Thị Trường',
      description: 'Hỗ trợ cập nhật dữ liệu chứng khoán Việt Nam, chứng chỉ quỹ và giá vàng',
    },
  ];

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % screenshots.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  const openModal = () => {
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = '';
  };

  return (
    <section className="screenshots-section">
      <div className="section-header">
        <span className="section-badge">Giao Diện</span>
        <h2 className="section-title">Trải Nghiệm Ứng Dụng</h2>
        <p className="section-description">
          Giao diện hiện đại, trực quan và dễ sử dụng
        </p>
      </div>

      <div className="screenshot-carousel">
        <button className="carousel-btn carousel-prev" onClick={prevSlide} aria-label="Previous">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="screenshot-container" onClick={openModal}>
          <div className="screenshot-window">
            <div className="screenshot-window-header">
              <div className="window-controls">
                <span className="window-dot red"></span>
                <span className="window-dot yellow"></span>
                <span className="window-dot green"></span>
              </div>
              <span className="window-title">{screenshots[activeIndex].title}</span>
            </div>
            <div className="screenshot-image-wrapper">
              <img
                src={screenshots[activeIndex].src}
                alt={screenshots[activeIndex].title}
                className="screenshot-image"
              />
            </div>
          </div>
          <div className="screenshot-info">
            <h3 className="screenshot-title">{screenshots[activeIndex].title}</h3>
            <p className="screenshot-description">{screenshots[activeIndex].description}</p>
          </div>
        </div>

        <button className="carousel-btn carousel-next" onClick={nextSlide} aria-label="Next">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="screenshot-dots">
        {screenshots.map((_, idx) => (
          <button
            key={idx}
            className={`screenshot-dot ${idx === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      <div className="screenshot-thumbnails">
        {screenshots.map((screenshot, idx) => (
          <button
            key={idx}
            className={`screenshot-thumbnail ${idx === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(idx)}
          >
            <img src={screenshot.src} alt={screenshot.title} />
          </button>
        ))}
      </div>

      {isModalOpen && (
        <div className="screenshot-modal" onClick={closeModal}>
          <button className="modal-close" onClick={closeModal}>×</button>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-nav modal-prev" onClick={prevSlide}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <img
              src={screenshots[activeIndex].src}
              alt={screenshots[activeIndex].title}
              className="modal-image"
            />
            <button className="modal-nav modal-next" onClick={nextSlide}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
          <div className="modal-info">
            <h3>{screenshots[activeIndex].title}</h3>
            <p>{screenshots[activeIndex].description}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function TechStackSection() {
  const technologies = [
    { name: 'Tauri', icon: '⚡', description: 'Framework nhẹ và nhanh' },
    { name: 'React', icon: '⚛️', description: 'UI hiện đại và mượt mà' },
    { name: 'Rust', icon: '🦀', description: 'Backend an toàn và hiệu suất cao' },
    { name: 'SQLite', icon: '🗄️', description: 'Lưu trữ dữ liệu cục bộ' },
  ];

  return (
    <section className="tech-section">
      <div className="section-header">
        <span className="section-badge">Công Nghệ</span>
        <h2 className="section-title">Xây Dựng Với Công Nghệ Hiện Đại</h2>
      </div>
      <div className="tech-grid">
        {technologies.map((tech, idx) => (
          <div key={idx} className="tech-card">
            <span className="tech-icon">{tech.icon}</span>
            <h4 className="tech-name">{tech.name}</h4>
            <p className="tech-description">{tech.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="cta-section">
      <div className="cta-content">
        <h2 className="cta-title">Sẵn Sàng Quản Lý Tài Chính?</h2>
        <p className="cta-description">
          Bắt đầu ngay hôm nay - hoàn toàn miễn phí và bảo mật
        </p>
        <div className="cta-buttons">
          <Link className="btn btn-primary btn-large" to="https://github.com/chipheo00/vn-wealthfolio/releases">
            <span>🚀</span> Tải Xuống Ngay
          </Link>
          <Link className="btn btn-ghost" to="/docs/intro">
            Tìm Hiểu Thêm →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title="Trang Chủ"
      description="WealthVN - Ứng dụng quản lý tài chính cá nhân và theo dõi danh mục đầu tư">
      <main className="landing-page">
        <HeroSection />
        <ScreenshotSection />
        <FeaturesSection />
        <TechStackSection />
        <CTASection />
      </main>
    </Layout>
  );
}
