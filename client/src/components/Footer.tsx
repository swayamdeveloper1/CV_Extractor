import React from "react";
import logo from "../assests/SS Logo_RGB.png";

const Footer: React.FC = () => {
  return (
    <footer className="mt-10 flex flex-col items-center justify-center pb-8 text-center">

      <div className="flex items-center gap-3">
        <img
          src={logo}
          alt="Swayam Solutions"
          className="w-8 h-8"
        />

        <span className="text-gray-400">
          Developed by
        </span>

        <a
          // href="https://swayamsolutions.com"
          // target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-500 hover:text-blue-400 transition"
        >
          Swayam Solutions
        </a>
      </div>

      <a
        href="/privacy-policy"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 text-sm text-blue-500 hover:text-blue-400 hover:underline"
      >
        Privacy Policy
      </a>

    </footer>
  );
};

export default Footer;