import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer bg-dark text-white py-3 mt-5">
      <div className="container">
        <div className="text-center">
          <p className="mb-0">© 2026 LearnHub. All rights reserved.</p>
          <p className="footer-contact mb-0 mt-1">
            Liên hệ:{' '}
            <a href="mailto:zahuy911@gmail.com">zahuy911@gmail.com</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
