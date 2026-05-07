import { defineComponent } from 'vue';
import WorkspaceShell from './components/WorkspaceShell';
import './styles/chat-tw.css';

export default defineComponent({
  name: 'ChatWorkspace',
  setup() {
    return () => (
      <div class="chat-page-route">
        <WorkspaceShell />
      </div>
    );
  }
});
