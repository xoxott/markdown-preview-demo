import { defineComponent, PropType } from 'vue';
import { NCard, NDescriptions, NDescriptionsItem, NCollapse, NCollapseItem } from 'naive-ui';

interface NetworkInterface {
  address: string;
  netmask: string;
  family: string;
  mac: string;
  internal: boolean;
  cidr?: string;
  scopeid?: number;
}

export default defineComponent({
  name: 'NetworkInfoCard',
  props: {
    title: {
      type: String,
      default: '网络信息'
    },
    network: {
      type: Object as PropType<Record<string, NetworkInterface[]> | null>,
      default: null
    },
    noCard: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    return () => {
      if (!props.network || Object.keys(props.network).length === 0) return null;
      
      const content = (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <NCollapse style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {Object.entries(props.network).map(([interfaceName, interfaces]) => (
                <NCollapseItem key={interfaceName} title={interfaceName} name={interfaceName}>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                    {interfaces.map((iface, index) => (
                      <NDescriptions
                        key={index}
                        bordered
                        size="small"
                        column={1}
                        style={{ marginBottom: '12px' }}
                      >
                        <NDescriptionsItem label="地址">
                          {iface.address}
                        </NDescriptionsItem>
                        <NDescriptionsItem label="子网掩码">
                          {iface.netmask}
                        </NDescriptionsItem>
                        <NDescriptionsItem label="协议族">
                          {iface.family}
                        </NDescriptionsItem>
                        <NDescriptionsItem label="MAC 地址">
                          {iface.mac}
                        </NDescriptionsItem>
                        <NDescriptionsItem label="内部">
                          {iface.internal ? '是' : '否'}
                        </NDescriptionsItem>
                        {iface.cidr && (
                          <NDescriptionsItem label="CIDR">
                            {iface.cidr}
                          </NDescriptionsItem>
                        )}
                        {iface.scopeid !== undefined && (
                          <NDescriptionsItem label="Scope ID">
                            {iface.scopeid}
                          </NDescriptionsItem>
                        )}
                      </NDescriptions>
                    ))}
                  </div>
                </NCollapseItem>
              ))}
            </NCollapse>
          </div>
      );

      if (props.noCard) {
        return content;
      }

      return (
        <NCard title={props.title} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {content}
        </NCard>
      );
    };
  }
});

