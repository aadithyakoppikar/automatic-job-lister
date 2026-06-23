document.addEventListener('DOMContentLoaded', () => {
    // Current State
    let currentScrapedJobs = [];
    let currentSelectedScrapedJob = null;
    let trackerJobs = [];

    // --- DOM Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewPanels = document.querySelectorAll('.view-panel');
    
    // Settings elements
    const settingsApiKey = document.getElementById('settings-api-key');
    const settingsSaveBtn = document.getElementById('btn-save-settings');
    const settingsAlert = document.getElementById('settings-alert');
    
    // Base Resume elements
    const baseResumeText = document.getElementById('base-resume-text');
    const saveResumeBtn = document.getElementById('btn-save-resume');
    const uploadZone = document.getElementById('upload-zone');
    const resumeFileInput = document.getElementById('resume-file-input');
    const uploadStatus = document.getElementById('upload-status');

    // Search Job elements
    const searchKeywords = document.getElementById('search-keywords');
    const searchLocation = document.getElementById('search-location');
    const searchJobsBtn = document.getElementById('btn-search-jobs');
    const searchLoading = document.getElementById('search-loading');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchJobDetailPanel = document.getElementById('search-job-detail-panel');
    const jobDetailEmpty = document.getElementById('job-detail-empty');
    const jobDetailContent = document.getElementById('job-detail-content');
    const detailTitle = document.getElementById('detail-title');
    const detailCompany = document.getElementById('detail-company');
    const detailLocation = document.getElementById('detail-location');
    const detailLink = document.getElementById('detail-link');
    const detailDescription = document.getElementById('detail-description');
    const btnOptimizeJob = document.getElementById('btn-optimize-job');
    const btnTrackScrapedJob = document.getElementById('btn-track-scraped-job');

    // Optimize Modal elements
    const optimizeModal = document.getElementById('optimize-modal');
    const btnCloseOptimizeModal = document.getElementById('btn-close-optimize-modal');
    const optimizeLoading = document.getElementById('optimize-loading');
    const optimizeError = document.getElementById('optimize-error');
    const optimizeResult = document.getElementById('optimize-result');
    const optimizedResumeEditor = document.getElementById('optimized-resume-editor');
    const btnSaveTailoredResume = document.getElementById('btn-save-tailored-resume');
    const btnPrintResume = document.getElementById('btn-print-resume');
    const btnRetryOptimize = document.getElementById('btn-retry-optimize');

    // Tracker elements
    const columns = {
        Draft: document.getElementById('col-Draft'),
        Applied: document.getElementById('col-Applied'),
        Interviewing: document.getElementById('col-Interviewing'),
        Offer: document.getElementById('col-Offer'),
        Rejected: document.getElementById('col-Rejected')
    };
    const columnCounts = {
        Draft: document.getElementById('count-Draft'),
        Applied: document.getElementById('count-Applied'),
        Interviewing: document.getElementById('count-Interviewing'),
        Offer: document.getElementById('count-Offer'),
        Rejected: document.getElementById('count-Rejected')
    };
    const btnAddManualJob = document.getElementById('btn-add-manual-job');

    // Job Modal elements
    const jobModal = document.getElementById('job-modal');
    const jobModalTitle = document.getElementById('job-modal-title');
    const btnCloseJobModal = document.getElementById('btn-close-job-modal');
    const jobForm = document.getElementById('job-form');
    const jobFormId = document.getElementById('job-form-id');
    const jobFormTitle = document.getElementById('job-form-title');
    const jobFormCompany = document.getElementById('job-form-company');
    const jobFormLocation = document.getElementById('job-form-location');
    const jobFormLink = document.getElementById('job-form-link');
    const jobFormStatus = document.getElementById('job-form-status');
    const jobFormAppliedDate = document.getElementById('job-form-applied-date');
    const jobFormDescription = document.getElementById('job-form-description');
    const tailoredResumeSection = document.getElementById('tailored-resume-section');
    const jobFormTailored = document.getElementById('job-form-tailored');
    const jobFormNotes = document.getElementById('job-form-notes');
    const btnDeleteJob = document.getElementById('btn-delete-job');
    const btnCancelJobForm = document.getElementById('btn-cancel-job-form');
    const btnPrintFormResume = document.getElementById('btn-print-form-resume');

    // Print elements
    const printLayout = document.getElementById('print-layout');

    // --- Tab Navigation ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            viewPanels.forEach(panel => panel.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(target).classList.add('active');

            if (target === 'tracker-view') {
                loadTrackerJobs();
            } else if (target === 'dashboard-view') {
                loadStats();
            }
        });
    });

    // --- Init App ---
    loadSettings();
    loadStats();

    // --- API Settings Functions ---
    async function loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            settingsApiKey.value = data.gemini_api_key || '';
            baseResumeText.value = data.base_resume || '';
        } catch (err) {
            console.error('Failed to load settings', err);
        }
    }

    settingsSaveBtn.addEventListener('click', async () => {
        const apiKey = settingsApiKey.value.trim();
        const baseResume = baseResumeText.value.trim();
        
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gemini_api_key: apiKey, base_resume: baseResume })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert(settingsAlert, 'success', 'Settings saved successfully!');
            } else {
                showAlert(settingsAlert, 'error', data.detail || 'Failed to save settings.');
            }
        } catch (err) {
            showAlert(settingsAlert, 'error', 'Error communicating with server.');
        }
    });

    function showAlert(element, type, message) {
        element.style.display = 'block';
        element.className = `alert alert-${type}`;
        element.textContent = message;
        setTimeout(() => {
            element.style.display = 'none';
        }, 4000);
    }

    // --- Base Resume Upload & Save ---
    saveResumeBtn.addEventListener('click', async () => {
        const baseResume = baseResumeText.value.trim();
        const apiKey = settingsApiKey.value.trim();
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gemini_api_key: apiKey, base_resume: baseResume })
            });
            if (res.ok) {
                alert('Base resume saved successfully!');
            } else {
                alert('Failed to save base resume.');
            }
        } catch (err) {
            console.error(err);
        }
    });

    uploadZone.addEventListener('click', () => resumeFileInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--primary)';
        uploadZone.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--border-color)';
        uploadZone.style.backgroundColor = 'transparent';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-color)';
        uploadZone.style.backgroundColor = 'transparent';
        if (e.dataTransfer.files.length > 0) {
            handleResumeUpload(e.dataTransfer.files[0]);
        }
    });

    resumeFileInput.addEventListener('change', () => {
        if (resumeFileInput.files.length > 0) {
            handleResumeUpload(resumeFileInput.files[0]);
        }
    });

    async function handleResumeUpload(file) {
        uploadStatus.innerHTML = `<div class="spinner" style="width:20px;height:20px;margin-bottom:8px;"></div><p>Extracting text...</p>`;
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload-resume', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok) {
                baseResumeText.value = data.text;
                uploadStatus.innerHTML = `<p style="color:var(--accent)">✓ Extracted successfully!</p>`;
                // Save it automatically
                const apiKey = settingsApiKey.value.trim();
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gemini_api_key: apiKey, base_resume: data.text })
                });
            } else {
                uploadStatus.innerHTML = `<p style="color:var(--danger)">✗ ${data.detail || 'Extraction failed'}</p>`;
            }
        } catch (err) {
            uploadStatus.innerHTML = `<p style="color:var(--danger)">✗ Network error</p>`;
            console.error(err);
        }
    }

    // --- Search LinkedIn Tab ---
    searchJobsBtn.addEventListener('click', async () => {
        const keywords = searchKeywords.value.trim();
        const location = searchLocation.value.trim();
        
        if (!keywords) {
            alert('Please enter job keywords.');
            return;
        }

        searchResultsContainer.innerHTML = '';
        searchLoading.style.display = 'flex';
        jobDetailContent.style.display = 'none';
        jobDetailEmpty.style.display = 'block';

        try {
            const res = await fetch(`/api/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`);
            const data = await res.json();
            currentScrapedJobs = data;
            
            searchLoading.style.display = 'none';
            
            if (data.length === 0) {
                searchResultsContainer.innerHTML = '<p class="empty-state">No jobs found. Try different keywords or location.</p>';
                return;
            }

            data.forEach(job => {
                const card = document.createElement('div');
                card.className = 'job-card';
                card.innerHTML = `
                    <h4>${job.title}</h4>
                    <p class="company">${job.company}</p>
                    <p>${job.location || ''}</p>
                `;
                card.addEventListener('click', () => {
                    document.querySelectorAll('.job-card').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    showJobDetail(job);
                });
                searchResultsContainer.appendChild(card);
            });
        } catch (err) {
            searchLoading.style.display = 'none';
            searchResultsContainer.innerHTML = '<p class="empty-state" style="color:var(--danger)">Error querying search API.</p>';
            console.error(err);
        }
    });

    async function showJobDetail(job) {
        currentSelectedScrapedJob = job;
        jobDetailEmpty.style.display = 'none';
        jobDetailContent.style.display = 'block';
        detailTitle.textContent = job.title;
        detailCompany.textContent = job.company;
        detailLocation.textContent = job.location || 'Unknown Location';
        detailLink.href = job.link;
        detailLink.style.display = job.link ? 'inline-block' : 'none';
        
        detailDescription.innerHTML = `<div class="spinner" style="width:24px;height:24px;margin:20px auto;"></div>`;

        try {
            const res = await fetch(`/api/job-description/${job.id}`);
            const data = await res.json();
            if (res.ok) {
                currentSelectedScrapedJob.description = data.description;
                detailDescription.textContent = data.description;
            } else {
                detailDescription.textContent = "Failed to fetch description. You can still track this job or try again.";
            }
        } catch (err) {
            detailDescription.textContent = "Error loading description details.";
            console.error(err);
        }
    }

    // --- Resume Optimization Modal & API ---
    btnOptimizeJob.addEventListener('click', () => {
        if (!currentSelectedScrapedJob || !currentSelectedScrapedJob.description) {
            alert('Job description is not loaded yet.');
            return;
        }
        optimizeModal.style.display = 'flex';
        runOptimization();
    });

    async function runOptimization() {
        optimizeLoading.style.display = 'flex';
        optimizeError.style.display = 'none';
        optimizeResult.style.display = 'none';

        try {
            const res = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_description: currentSelectedScrapedJob.description })
            });
            const data = await res.json();
            
            optimizeLoading.style.display = 'none';
            
            if (res.ok) {
                optimizeResult.style.display = 'block';
                optimizedResumeEditor.value = data.optimized_resume;
            } else {
                optimizeError.style.display = 'block';
                optimizeError.querySelector('.error-text').textContent = data.detail || 'An error occurred during optimization.';
            }
        } catch (err) {
            optimizeLoading.style.display = 'none';
            optimizeError.style.display = 'block';
            optimizeError.querySelector('.error-text').textContent = 'Network error while contacting API.';
        }
    }

    btnRetryOptimize.addEventListener('click', runOptimization);
    btnCloseOptimizeModal.addEventListener('click', () => optimizeModal.style.display = 'none');

    // Save Tailored Resume
    btnSaveTailoredResume.addEventListener('click', async () => {
        const tailoredText = optimizedResumeEditor.value.trim();
        if (!tailoredText) return;

        // Auto-save this job application
        const jobData = {
            title: currentSelectedScrapedJob.title,
            company: currentSelectedScrapedJob.company,
            location: currentSelectedScrapedJob.location,
            link: currentSelectedScrapedJob.link,
            description: currentSelectedScrapedJob.description,
            status: 'Draft',
            tailored_resume: tailoredText,
            notes: `Tailored automatically using Gemini 1.5 Flash.`
        };

        try {
            const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });
            if (res.ok) {
                optimizeModal.style.display = 'none';
                alert('Job application saved to tracker with tailored resume!');
                loadTrackerJobs();
            } else {
                const data = await res.json();
                alert(`Error saving job: ${data.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
        }
    });

    // Print Resume
    btnPrintResume.addEventListener('click', () => {
        const text = optimizedResumeEditor.value;
        printTailoredResume(text);
    });

    // --- Tracker View Functions ---
    async function loadTrackerJobs() {
        try {
            const res = await fetch('/api/jobs');
            const data = await res.json();
            trackerJobs = data;
            renderKanban();
        } catch (err) {
            console.error('Failed to load tracker jobs', err);
        }
    }

    function renderKanban() {
        // Clear all columns
        Object.keys(columns).forEach(status => {
            columns[status].innerHTML = '';
            columnCounts[status].textContent = '0';
        });

        const counts = { Draft: 0, Applied: 0, Interviewing: 0, Offer: 0, Rejected: 0 };

        trackerJobs.forEach(job => {
            const status = job.status || 'Draft';
            counts[status]++;
            
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.innerHTML = `
                <h4>${job.title}</h4>
                <p class="card-company">${job.company}</p>
                <p>${job.location || ''}</p>
                <div class="card-footer">
                    <span>${job.applied_date ? job.applied_date : ''}</span>
                    <span>${job.tailored_resume ? '✦ Tailored' : ''}</span>
                </div>
            `;
            
            card.addEventListener('click', () => openJobEditor(job));
            
            if (columns[status]) {
                columns[status].appendChild(card);
            }
        });

        // Update counts
        Object.keys(columnCounts).forEach(status => {
            columnCounts[status].textContent = counts[status];
        });
    }

    btnTrackScrapedJob.addEventListener('click', async () => {
        if (!currentSelectedScrapedJob) return;
        
        const jobData = {
            title: currentSelectedScrapedJob.title,
            company: currentSelectedScrapedJob.company,
            location: currentSelectedScrapedJob.location,
            link: currentSelectedScrapedJob.link,
            description: currentSelectedScrapedJob.description || '',
            status: 'Draft',
            tailored_resume: '',
            notes: ''
        };

        try {
            const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });
            const data = await res.json();
            if (res.ok) {
                alert('Added to tracker!');
                loadTrackerJobs();
            } else {
                alert(`Error: ${data.detail}`);
            }
        } catch (err) {
            console.error(err);
        }
    });

    // --- Job Modal Editor ---
    btnAddManualJob.addEventListener('click', () => {
        openJobEditor(null);
    });

    function openJobEditor(job) {
        jobModal.style.display = 'flex';
        jobForm.reset();
        
        if (job) {
            // Edit Mode
            jobModalTitle.textContent = 'Edit Application';
            jobFormId.value = job.id;
            jobFormTitle.value = job.title;
            jobFormCompany.value = job.company;
            jobFormLocation.value = job.location || '';
            jobFormLink.value = job.link || '';
            jobFormStatus.value = job.status;
            jobFormAppliedDate.value = job.applied_date || '';
            jobFormDescription.value = job.description || '';
            jobFormNotes.value = job.notes || '';
            
            if (job.tailored_resume) {
                tailoredResumeSection.style.display = 'block';
                jobFormTailored.value = job.tailored_resume;
            } else {
                tailoredResumeSection.style.display = 'none';
            }
            
            btnDeleteJob.style.display = 'block';
        } else {
            // New Mode
            jobModalTitle.textContent = 'Add Application Manually';
            jobFormId.value = '';
            jobFormStatus.value = 'Draft';
            tailoredResumeSection.style.display = 'none';
            btnDeleteJob.style.display = 'none';
        }
    }

    btnCloseJobModal.addEventListener('click', () => jobModal.style.display = 'none');
    btnCancelJobForm.addEventListener('click', () => jobModal.style.display = 'none');

    jobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = jobFormId.value;
        const jobData = {
            title: jobFormTitle.value.trim(),
            company: jobFormCompany.value.trim(),
            location: jobFormLocation.value.trim(),
            link: jobFormLink.value.trim(),
            status: jobFormStatus.value,
            applied_date: jobFormAppliedDate.value || null,
            description: jobFormDescription.value.trim(),
            tailored_resume: jobFormTailored.value.trim(),
            notes: jobFormNotes.value.trim()
        };

        try {
            let res;
            if (id) {
                // Update
                res = await fetch(`/api/jobs/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jobData)
                });
            } else {
                // Create
                res = await fetch('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jobData)
                });
            }

            if (res.ok) {
                jobModal.style.display = 'none';
                loadTrackerJobs();
            } else {
                const data = await res.json();
                alert(`Error saving job: ${data.detail}`);
            }
        } catch (err) {
            console.error(err);
        }
    });

    btnDeleteJob.addEventListener('click', async () => {
        const id = jobFormId.value;
        if (!id) return;
        if (!confirm('Are you sure you want to delete this job application?')) return;

        try {
            const res = await fetch(`/api/jobs/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                jobModal.style.display = 'none';
                loadTrackerJobs();
            } else {
                alert('Failed to delete job application.');
            }
        } catch (err) {
            console.error(err);
        }
    });

    btnPrintFormResume.addEventListener('click', () => {
        const text = jobFormTailored.value;
        printTailoredResume(text);
    });

    // --- Dashboard Stats ---
    async function loadStats() {
        try {
            const res = await fetch('/api/jobs');
            const data = await res.json();
            
            const stats = { Draft: 0, Applied: 0, Interviewing: 0, Offer: 0, Rejected: 0 };
            data.forEach(job => {
                if (stats[job.status] !== undefined) {
                    stats[job.status]++;
                }
            });

            document.getElementById('stat-drafts').textContent = stats.Draft;
            document.getElementById('stat-applied').textContent = stats.Applied;
            document.getElementById('stat-interviews').textContent = stats.Interviewing;
            document.getElementById('stat-offers').textContent = stats.Offer;
        } catch (err) {
            console.error(err);
        }
    }

    // --- Print Parser & Functionality ---
    function printTailoredResume(text) {
        if (!text) {
            alert('No resume content to print.');
            return;
        }
        
        const html = parseResumeToHtml(text);
        printLayout.innerHTML = html;
        window.print();
    }

    function parseResumeToHtml(text) {
        const lines = text.split('\n');
        let html = '<div class="resume-print">';
        
        const sectionHeaders = ['NAME', 'CONTACT', 'SUMMARY', 'PROFESSIONAL EXPERIENCE', 'EDUCATION', 'SKILLS'];
        const sections = {};
        let activeHeader = '';
        let currentContent = [];
        
        for (let line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            if (sectionHeaders.includes(trimmed.toUpperCase())) {
                if (activeHeader) {
                    sections[activeHeader] = [...currentContent];
                }
                activeHeader = trimmed.toUpperCase();
                currentContent = [];
            } else {
                if (activeHeader) {
                    currentContent.push(trimmed);
                } else {
                    if (!sections['NAME']) {
                        sections['NAME'] = [trimmed];
                    } else {
                        sections['NAME'].push(trimmed);
                    }
                }
            }
        }
        if (activeHeader) {
            sections[activeHeader] = [...currentContent];
        }
        
        // 1. Name
        if (sections['NAME'] && sections['NAME'].length > 0) {
            html += `<div class="resume-header">`;
            html += `<div class="resume-name">${sections['NAME'][0]}</div>`;
            
            // Contact block
            let contactInfo = [];
            if (sections['CONTACT']) {
                contactInfo = sections['CONTACT'];
            } else if (sections['NAME'].length > 1) {
                contactInfo = sections['NAME'].slice(1);
            }
            
            if (contactInfo.length > 0) {
                html += `<div class="resume-contact">${contactInfo.join('  |  ')}</div>`;
            }
            html += `</div>`;
        }
        
        // 2. Summary
        if (sections['SUMMARY'] && sections['SUMMARY'].length > 0) {
            html += `<div class="resume-section">`;
            html += `<div class="resume-section-title">Summary</div>`;
            html += `<div class="resume-summary">${sections['SUMMARY'].join(' ')}</div>`;
            html += `</div>`;
        }
        
        // 3. Experience
        if (sections['PROFESSIONAL EXPERIENCE'] && sections['PROFESSIONAL EXPERIENCE'].length > 0) {
            html += `<div class="resume-section">`;
            html += `<div class="resume-section-title">Professional Experience</div>`;
            
            let expLines = sections['PROFESSIONAL EXPERIENCE'];
            let currentJob = null;
            
            for (let i = 0; i < expLines.length; i++) {
                const line = expLines[i];
                
                if (line.includes('|') && !line.startsWith('-')) {
                    if (currentJob) {
                        html += renderJobHtml(currentJob);
                    }
                    
                    const parts = line.split('|').map(s => s.trim());
                    let company = parts[0] || '';
                    let location = parts[1] || '';
                    
                    let title = '';
                    let dates = '';
                    
                    if (i + 1 < expLines.length && expLines[i+1].includes('|') && !expLines[i+1].startsWith('-')) {
                        const subParts = expLines[i+1].split('|').map(s => s.trim());
                        title = subParts[0] || '';
                        dates = subParts[1] || '';
                        i++;
                    }
                    
                    currentJob = { company, location, title, dates, bullets: [] };
                } else if (line.startsWith('-')) {
                    if (currentJob) {
                        currentJob.bullets.push(line.replace(/^-\s*/, ''));
                    }
                } else {
                    if (currentJob) {
                        currentJob.bullets.push(line);
                    }
                }
            }
            if (currentJob) {
                html += renderJobHtml(currentJob);
            }
            html += `</div>`;
        }
        
        // 4. Education
        if (sections['EDUCATION'] && sections['EDUCATION'].length > 0) {
            html += `<div class="resume-section">`;
            html += `<div class="resume-section-title">Education</div>`;
            
            let eduLines = sections['EDUCATION'];
            let school = '';
            let location = '';
            let degree = '';
            let dates = '';
            
            for (let i = 0; i < eduLines.length; i++) {
                const line = eduLines[i];
                if (line.includes('|')) {
                    const parts = line.split('|').map(s => s.trim());
                    if (!school) {
                        school = parts[0] || '';
                        location = parts[1] || '';
                    } else {
                        degree = parts[0] || '';
                        dates = parts[1] || '';
                        
                        html += `
                        <div class="education-entry">
                            <div class="education-header">
                                <span class="school">${school}</span>
                                <span class="location">${location}</span>
                            </div>
                            <div class="education-sub">
                                <span class="degree">${degree}</span>
                                <span class="dates">${dates}</span>
                            </div>
                        </div>`;
                        school = ''; location = ''; degree = ''; dates = '';
                    }
                } else {
                    if (!school) {
                        school = line;
                    } else {
                        degree = line;
                        html += `
                        <div class="education-entry">
                            <div class="education-header">
                                <span class="school">${school}</span>
                                <span class="location"></span>
                            </div>
                            <div class="education-sub">
                                <span class="degree">${degree}</span>
                                <span class="dates"></span>
                            </div>
                        </div>`;
                        school = ''; degree = '';
                    }
                }
            }
            html += `</div>`;
        }
        
        // 5. Skills
        if (sections['SKILLS'] && sections['SKILLS'].length > 0) {
            html += `<div class="resume-section">`;
            html += `<div class="resume-section-title">Skills</div>`;
            
            for (let line of sections['SKILLS']) {
                if (line.includes(':')) {
                    const idx = line.indexOf(':');
                    const cat = line.substring(0, idx).trim();
                    const val = line.substring(idx + 1).trim();
                    html += `
                    <div class="skills-entry">
                        <div class="skills-category">${cat}:</div> ${val}
                    </div>`;
                } else {
                    html += `
                    <div class="skills-entry">
                        ${line.replace(/^-\s*/, '')}
                    </div>`;
                }
            }
            html += `</div>`;
        }
        
        html += '</div>';
        return html;
    }

    function renderJobHtml(job) {
        let bulletsHtml = '';
        if (job.bullets && job.bullets.length > 0) {
            bulletsHtml += '<ul class="bullets">';
            for (let b of job.bullets) {
                bulletsHtml += `<li>${b}</li>`;
            }
            bulletsHtml += '</ul>';
        }
        
        return `
        <div class="job-entry">
            <div class="job-header">
                <span class="company">${job.company}</span>
                <span class="location">${job.location}</span>
            </div>
            <div class="job-sub">
                <span class="title">${job.title}</span>
                <span class="dates">${job.dates}</span>
            </div>
            ${bulletsHtml}
        </div>`;
    }
});
