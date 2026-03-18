import React from 'react';
import packageJson from '../../package.json';

const ipcRenderer = (window as any).electronAPI ?? null;

const openExternal = (url: string) => {
  if (ipcRenderer) ipcRenderer.send('open-external', url);
};

const LINKS = [
  { label: 'Source Code',       url: 'https://github.com/s4nby/TaskFlow' },
  { label: 'Official Website',  url: 'https://github.com/s4nby/TaskFlow' },
  { label: 'Contact / Support', url: 'mailto:95icarus@gmail.com' },
  { label: 'Issue Tracking',    url: 'https://github.com/s4nby/TaskFlow/issues' },
];

const DEPS = [
  { name: 'React',              version: '19.2',  desc: 'UI framework' },
  { name: 'Electron',           version: '40.8',  desc: 'Desktop runtime' },
  { name: 'TypeScript',         version: '5.9',   desc: 'Type safety' },
  { name: 'Vite',               version: '7.3',   desc: 'Build tool' },
  { name: 'electron-builder',   version: '26.8',  desc: 'Packaging & distribution' },
  { name: 'electron-updater',   version: '6.8',   desc: 'Auto-update' },
  { name: 'Lucide React',       version: '0.577', desc: 'Icon set' },
  { name: 'electron-log',       version: '5.4',   desc: 'Logging' },
  { name: 'dotenv',             version: '17.3',  desc: 'Environment configuration' },
];

const AboutView: React.FC = () => (
  <div className="about-view">

    {/* Header */}
    <h1 className="about-title">Information</h1>
    <div className="about-hr" />

    {/* Branding */}
    <div className="about-branding">
      <img src="icon_32x32.png" className="about-icon" alt="TaskFlow icon" />
      <div className="about-app-meta">
        <span className="about-app-name">TaskFlow</span>
        <span className="about-app-version">v{packageJson.version}</span>
      </div>
    </div>

    {/* Description */}
    <p className="about-description">
      A free and open-source task management tool designed for streamlined navigation.
    </p>

    {/* Links */}
    <div className="about-section">
      {LINKS.map(({ label, url }) => (
        <div key={label} className="about-link-row">
          <span className="about-link-label">{label}</span>
          <button className="about-link-btn" onClick={() => openExternal(url)}>
            {url.startsWith('mailto:') ? url.replace('mailto:', '') : url.replace('https://', '')}
          </button>
        </div>
      ))}
    </div>

    <div className="about-hr" />

    {/* Dependencies */}
    <div className="about-section">
      <h2 className="about-section-title">Dependencies &amp; Credits</h2>
      <div className="about-deps">
        {DEPS.map(({ name, version, desc }) => (
          <div key={name} className="about-dep-row">
            <span className="about-dep-name">{name}</span>
            <span className="about-dep-version">{version}</span>
            <span className="about-dep-desc">{desc}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="about-hr" />

    {/* Disclaimer */}
    <p className="about-disclaimer">
      THIS SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.
      THE AUTHORS AND CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY CLAIM, DAMAGES,
      OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
      ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
      OTHER DEALINGS IN THE SOFTWARE.
    </p>

  </div>
);

export default AboutView;
