import { Text } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { t } from '@/i18n';

export default function ChineseScreen() {
  return (
    <Screen title={t('chinese')} subtitle={t('comingSoon')} back>
      <Card>
        <Text>{t('placeholderChinese')}</Text>
      </Card>
    </Screen>
  );
}
