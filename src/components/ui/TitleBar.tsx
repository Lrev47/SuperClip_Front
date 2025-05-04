import { Link } from 'react-router-dom';
import SuperClipLogo from '../../assets/super-clip-logo.svg';

const TitleBar = () => {
  return (
    <header className="bg-dark-800 border-b border-dark-700">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <img src={SuperClipLogo} alt="SuperClip Logo" className="h-8 w-8" />
            <span className="ml-2 text-xl font-semibold text-white">SuperClip</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default TitleBar; 