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
    <div>
      <button disabled={lang === 'en'} onClick={() => changeLanguage('en')}>
        {t('english')}
      </button>
      <button disabled={lang === 'el'} onClick={() => changeLanguage('el')}>
        {t('greek')}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
