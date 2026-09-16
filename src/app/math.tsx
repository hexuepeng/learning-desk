import { Card, Screen } from '@/components/ui';
import { t } from '@/i18n';
import { Text } from 'react-native';

export default function MathScreen() {
  return (
    <Screen title={t('math')} subtitle={t('comingSoon')} back>
      <Card>
        <Text>{t('placeholderMath')}</Text>
      </Card>
    </Screen>
  );
}
