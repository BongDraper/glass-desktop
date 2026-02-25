        // --- CONFIGURATION DATA ---
        const PROJECTS_STORAGE_KEY = 'glass-desktop-projects-v1';

        function cloneSeedProjects() {
            return window.seedProjects.map((project) => ({ ...project }));
        }

        function sanitizeProjects(candidateProjects) {
            if (!Array.isArray(candidateProjects)) return cloneSeedProjects();

            const normalizedProjects = candidateProjects
                .map((rawProject, index) => {
                    if (!rawProject || typeof rawProject !== 'object') return null;

                    const normalizedId = (typeof rawProject.id === 'string' && rawProject.id.trim())
                        ? rawProject.id.trim()
                        : `p-local-${index}`;

                    return {
                        id: normalizedId,
                        brand: typeof rawProject.brand === 'string' ? rawProject.brand : '',
                        title: typeof rawProject.title === 'string' && rawProject.title.trim() ? rawProject.title : 'Untitled Project',
                        icon: typeof rawProject.icon === 'string' ? rawProject.icon : '📂',
                        desc: typeof rawProject.desc === 'string' ? rawProject.desc : '',
                        stats: typeof rawProject.stats === 'string' ? rawProject.stats : '',
                        video: typeof rawProject.video === 'string' ? rawProject.video : '',
                        customIcon: typeof rawProject.customIcon === 'string' ? rawProject.customIcon : ''
                    };
                })
                .filter(Boolean);

            return normalizedProjects.length ? normalizedProjects : cloneSeedProjects();
        }

        function loadProjects() {
            const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
            if (!savedProjects) return cloneSeedProjects();

            try {
                const parsed = JSON.parse(savedProjects);
                return sanitizeProjects(parsed);
            } catch (err) {
                console.warn('Ignoring invalid saved projects payload.', err);
            }

            return cloneSeedProjects();
        }

        let projects = sanitizeProjects(loadProjects());

        function persistProjects() {
            projects = sanitizeProjects(projects);
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
        }

        function exportProjectsForRepo() {
            const scriptContent = `window.seedProjects = ${JSON.stringify(projects, null, 4)};
`;
            const blob = new Blob([scriptContent], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'projects-data.js';
            downloadLink.click();
            URL.revokeObjectURL(url);
            alert('Downloaded projects-data.js. Replace scripts/projects-data.js in your repo and commit it.');
        }

        function resetLocalProjects() {
            const shouldReset = confirm('Reset all local project/icon edits back to the repository seed data?');
            if (!shouldReset) return;

            localStorage.removeItem(PROJECTS_STORAGE_KEY);
            projects = sanitizeProjects(cloneSeedProjects());
            pendingIconData = null;
            updateDesktop();
            renderCMSList();
        }

        window.exportProjectsForRepo = exportProjectsForRepo;
        window.resetLocalProjects = resetLocalProjects;

        let currentWallpaper = '';

        // --- CORE UI LOGIC ---
        function updateDesktop() {
            const grid = document.getElementById('iconGrid');
            grid.innerHTML = '';
            
            const pIcon = document.createElement('div');
            pIcon.className = 'desktop-icon';
            pIcon.onclick = () => openWindow('win-paint');
            pIcon.innerHTML = `<div class="icon-display">🎨</div><div class="icon-label">Paint</div>`;
            grid.appendChild(pIcon);

            projects.forEach(p => {
                if (!p || !p.id) return;
                const icon = document.createElement('div');
                icon.className = 'desktop-icon';
                icon.onclick = () => openProjectWindow(p.id);
                const iconStyle = p.customIcon ? `background-image:url(${p.customIcon})` : '';
                icon.innerHTML = `<div class="icon-display" style="${iconStyle}">${p.customIcon ? '' : (p.icon || '📂')}</div><div class="icon-label">${p.title}</div>`;
                grid.appendChild(icon);
            });
            
            if (document.getElementById('control-panel').style.display === 'flex') renderCMSList();
            if (currentWallpaper) document.getElementById('desktop').style.backgroundImage = `url(${currentWallpaper})`;
        }

        function openProjectWindow(id) {
            const p = projects.find(proj => proj.id === id);
            if (!p) return;
            let winId = `win-${id}`, win = document.getElementById(winId);
            if (!win) {
                win = document.createElement('div'); win.id = winId; win.className = 'window';
                win.style.width = '600px'; win.style.top = '100px'; win.style.left = '200px';
                document.getElementById('project-windows-container').appendChild(win);
            }
            let videoHtml = `<div class="media-container" style="display:flex; align-items:center; justify-content:center; color:#999; font-size:12px">No Media Linked</div>`;
            if (p.video) {
                if (p.video.includes('youtube.com') || p.video.includes('youtu.be')) {
                    const vidId = p.video.split('v=')[1] || p.video.split('/').pop().split('?')[0];
                    videoHtml = `<div class="media-container"><iframe src="https://www.youtube.com/embed/${vidId}"></iframe></div>`;
                } else if (p.video.includes('vimeo.com')) {
                    const vidId = p.video.split('/').pop().split('?')[0];
                    videoHtml = `<div class="media-container"><iframe src="https://player.vimeo.com/video/${vidId}"></iframe></div>`;
                } else { videoHtml = `<div class="media-container"><video src="${p.video}" controls style="width:100%; height:100%"></video></div>`; }
            }
            win.innerHTML = `<div class="window-header"><span>${p.brand} - ${p.title}</span><div class="win-controls"><div class="win-btn win-close" onclick="closeWindow('${winId}')">X</div></div></div><div class="window-body"><div class="project-content"><p style="text-transform:uppercase; font-size:10px; font-weight:bold; color:#666">${p.brand}</p><h2 style="margin-top:2px">${p.title}</h2>${videoHtml}<p style="font-size:13px; line-height:1.4">${p.desc}</p><p style="font-size:11px; font-weight:bold; color:var(--xp-blue)">${p.stats || ''}</p></div></div>`;
            win.style.display = 'flex'; focusWindow(winId);
        }

        function closeWindow(id) { document.getElementById(id).style.display = 'none'; }
        function openWindow(id) { document.getElementById(id).style.display = 'flex'; focusWindow(id); }
        function focusWindow(id) { document.querySelectorAll('.window').forEach(w => w.style.zIndex = 100); document.getElementById(id).style.zIndex = 200; }

        function renderCMSList() {
            const main = document.getElementById('cms-main');
            main.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px"><h3 style="margin:0">Pick a project...</h3><button class="btn btn-primary" onclick="renderCMSEdit()">+ Add New</button></div><div id="cms-list"></div>`;
            const list = document.getElementById('cms-list');
            projects.sort((a,b) => (a.title || '').localeCompare(b.title || '')).forEach(p => {
                const item = document.createElement('div'); item.className = 'cms-list-item';
                item.innerText = `${p.brand} - ${p.title}`; item.onclick = () => renderCMSEdit(p.id);
                list.appendChild(item);
            });
        }

        let pendingIconData = null;
        function renderCMSEdit(id = null) {
            const p = id ? projects.find(proj => proj.id === id) : { brand: '', title: '', desc: '', video: '', icon: '⚙️', stats: '', customIcon: '' };
            const main = document.getElementById('cms-main');
            main.innerHTML = `<h3 style="margin-top:0">${id ? 'Edit ' + p.title : 'New Project'}</h3><div class="form-group"><label>Title:</label><input type="text" id="edit-title" value="${p.title}"></div><div class="form-group"><label>Brand:</label><input type="text" id="edit-brand" value="${p.brand}"></div><div class="form-group"><label>Stats:</label><input type="text" id="edit-stats" value="${p.stats}"></div><div class="form-group"><label>Description:</label><textarea id="edit-desc" rows="4">${p.desc}</textarea></div><div class="form-group"><label>Media Link:</label><input type="text" id="edit-video" value="${p.video || ''}"></div><div class="form-group"><label>Icon:</label><div style="display:flex; align-items:center; gap:10px"><div id="icon-preview" style="width:48px; height:48px; border:1px solid #ccc; background-size:contain; background-position:center; background-repeat:no-repeat; background-image:${p.customIcon ? 'url('+p.customIcon+')' : 'none'}">${p.customIcon ? '' : p.icon}</div><button class="btn" onclick="document.getElementById('projectIconInput').click()">Upload Icon</button></div><div style="margin-top:6px; font-size:11px; color:#666">Upload saves in this browser. Use "Export Project Data" to save changes back into the repo.</div></div><div class="form-actions"><button class="btn btn-primary" onclick="saveProject('${id}')">Apply Changes</button><button class="btn" onclick="renderCMSList()">Cancel</button></div>`;
        }

        document.getElementById('projectIconInput').onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => { pendingIconData = ev.target.result; const prev = document.getElementById('icon-preview'); prev.style.backgroundImage = `url(${pendingIconData})`; prev.innerText = ''; };
            reader.readAsDataURL(e.target.files[0]);
            e.target.value = '';
        };

        function saveProject(id) {
            const title = document.getElementById('edit-title').value, brand = document.getElementById('edit-brand').value, stats = document.getElementById('edit-stats').value, desc = document.getElementById('edit-desc').value, video = document.getElementById('edit-video').value;
            if (id && id !== 'null') {
                const p = projects.find(proj => proj.id === id);
                if (!p) return;
                Object.assign(p, { title, brand, stats, desc, video });
                if (pendingIconData) p.customIcon = pendingIconData;
            } else {
                projects.push({ id: 'p-' + Date.now(), title, brand, stats, desc, video, icon: '📂', customIcon: pendingIconData });
            }
            pendingIconData = null;
            persistProjects();
            updateDesktop();
        }

        const canvas = document.getElementById('paintCanvas'), ctx = canvas.getContext('2d');
        let painting = false, paintColor = 'black';
        window.setPaintColor = (c) => { paintColor = c; };
        window.clearPaint = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.addEventListener('mousedown', (e) => { painting = true; draw(e); });
        canvas.addEventListener('mouseup', () => { painting = false; ctx.beginPath(); });
        canvas.addEventListener('mousemove', draw);
        function draw(e) { if (!painting) return; const rect = canvas.getBoundingClientRect(); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = paintColor; ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top); }

        function promptLogin() {
            document.getElementById('startMenu').style.display = 'none';
            document.getElementById('passInput').value = '';
            openWindow('loginModal');
        }

        const AUTH_KEY = 'glass-desktop-auth-v1';

        async function hashPassword(password) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const digest = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
        }

        async function checkPass() {
            const passInput = document.getElementById('passInput');
            const password = passInput.value.trim();

            if (!password) {
                alert('Enter a password.');
                return;
            }

            const savedHash = localStorage.getItem(AUTH_KEY);
            const incomingHash = await hashPassword(password);

            if (!savedHash) {
                localStorage.setItem(AUTH_KEY, incomingHash);
                alert('Password set for this browser. Use it next time to unlock Control Panel.');
                closeWindow('loginModal');
                openWindow('control-panel');
                renderCMSList();
                return;
            }

            if (incomingHash === savedHash) {
                closeWindow('loginModal');
                openWindow('control-panel');
                renderCMSList();
            } else {
                alert('Access Denied');
            }
        }

        // Start Menu Toggle
        document.getElementById('startBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const sm = document.getElementById('startMenu');
            sm.style.display = (sm.style.display === 'flex') ? 'none' : 'flex';
        });

        // Close start menu on outside click
        window.addEventListener('click', () => {
            document.getElementById('startMenu').style.display = 'none';
        });

        document.getElementById('cpTrigger').onclick = () => promptLogin();
        document.getElementById('loginSubmit').onclick = () => checkPass();

        document.getElementById('wallpaperInput').onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => { currentWallpaper = ev.target.result; document.getElementById('desktop').style.backgroundImage = `url(${currentWallpaper})`; };
            reader.readAsDataURL(e.target.files[0]);
        };

        document.addEventListener('mousedown', e => {
            const header = e.target.closest('.window-header'); if (!header) return;
            const win = header.parentElement; focusWindow(win.id);
            let offset = { x: e.clientX - win.offsetLeft, y: e.clientY - win.offsetTop };
            const onMove = moveE => { win.style.left = (moveE.clientX - offset.x) + 'px'; win.style.top = (moveE.clientY - offset.y) + 'px'; };
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });

        setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }, 1000);

        // Ensure admin windows remain closed on initial load
        closeWindow('control-panel');
        closeWindow('loginModal');

        updateDesktop();
    
