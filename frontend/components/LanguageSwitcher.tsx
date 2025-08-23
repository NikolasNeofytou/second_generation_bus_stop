import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const LanguageSwitcher: React.FC = () => {
  const router = useRouter();
  const { locale, asPath } = router;
  const { t } = useTranslation('common');

  const changeLanguage = (lng: string) => {
    localStorage.setItem('locale', lng);
    router.push(asPath, asPath, { locale: lng });
  };

  return (
    <div>
      <button disabled={locale === 'en'} onClick={() => changeLanguage('en')}>
        {t('english')}
      </button>
      <button disabled={locale === 'el'} onClick={() => changeLanguage('el')}>
        {t('greek')}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
