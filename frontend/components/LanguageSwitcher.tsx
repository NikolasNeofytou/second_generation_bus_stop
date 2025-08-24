import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import setLanguage from 'next-translate/setLanguage';

const LanguageSwitcher: React.FC = () => {
  const router = useRouter();
  const { t, lang } = useTranslation('common');

  const changeLanguage = async (lng: string) => {
    localStorage.setItem('locale', lng);
    await setLanguage(lng);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
          lang === 'en'
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent'
            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        disabled={lang === 'en'}
        onClick={() => changeLanguage('en')}
      >
        {t('english')}
      </button>
      <button
        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
          lang === 'el'
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent'
            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        disabled={lang === 'el'}
        onClick={() => changeLanguage('el')}
      >
        {t('greek')}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
