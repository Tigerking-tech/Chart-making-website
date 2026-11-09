import { getLang } from '@/lib/lang-server';
import { HomeClient } from '@/components/HomeClient';

export default function Home() {
  const lang = getLang();
  return <HomeClient lang={lang} />;
}
