import { defineComponent, type PropType } from 'vue';
import { NText } from 'naive-ui';
import type { DateRendererConfig } from '../types';

export default defineComponent({
  name: 'DateRenderer',
  props: {
    row: {
      type: Object as PropType<Record<string, any>>,
      required: true
    },
    field: {
      type: String,
      required: true
    },
    config: {
      type: Object as PropType<DateRendererConfig>,
      default: () => ({})
    }
  },
  setup(props) {
    const formatDate = (dateStr: string | null | undefined, config: DateRendererConfig) => {
      if (!dateStr) {
        return config.emptyText || '-';
      }

      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      const format = config.format || 'datetime';

      switch (format) {
        case 'date':
          return date.toLocaleDateString('zh-CN');
        case 'time':
          return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        case 'datetime':
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        case 'relative':
          if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
              const minutes = Math.floor(diff / (1000 * 60));
              return minutes <= 0 ? '刚刚' : `${minutes}分钟前`;
            }
            return `${hours}小时前`;
          }
          if (days < 7) {
            return `${days}天前`;
          }
          if (days < 30) {
            return `${Math.floor(days / 7)}周前`;
          }
          if (days < 365) {
            return `${Math.floor(days / 30)}个月前`;
          }
          return `${Math.floor(days / 365)}年前`;
        case 'smart':
          if (days === 0) {
            return date.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          }
          if (days < 7) {
            return `${days}天前`;
          }
          return date.toLocaleDateString('zh-CN');
        default:
          if (config.formatString) {
            // Simple format string support
            return config.formatString
              .replace('YYYY', date.getFullYear().toString())
              .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
              .replace('DD', String(date.getDate()).padStart(2, '0'))
              .replace('HH', String(date.getHours()).padStart(2, '0'))
              .replace('mm', String(date.getMinutes()).padStart(2, '0'))
              .replace('ss', String(date.getSeconds()).padStart(2, '0'));
          }
          return date.toLocaleString('zh-CN');
      }
    };

    return () => {
      const { row, field, config } = props;
      const dateStr = row[field];
      const formatted = formatDate(dateStr, config);

      if (formatted === (config.emptyText || '-')) {
        return <NText depth={3}>{formatted}</NText>;
      }

      // Smart coloring based on date
      if (config.format === 'smart') {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
          return <NText type="success">{formatted}</NText>;
        }
        if (days < 7) {
          return <NText>{formatted}</NText>;
        }
        return <NText depth={3}>{formatted}</NText>;
      }

      return <NText>{formatted}</NText>;
    };
  }
});

