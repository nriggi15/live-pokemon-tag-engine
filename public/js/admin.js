// /public/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("🧠 admin.js loaded");
  
    async function loadAdminStats() {
      try {
        const [userRes, tagRes, topTagsRes] = await Promise.all([
          fetch('/api/admin/stats/users', { credentials: 'include' }),
          fetch('/api/admin/stats/tags', { credentials: 'include' }),
          fetch('/api/admin/stats/most-used-tags', { credentials: 'include' })
        ]);
  
        const userData = await userRes.json();
        const tagData = await tagRes.json();
        const topTagsData = await topTagsRes.json();
  
        document.getElementById('userCount').textContent = userData.totalUsers;
        document.getElementById('tagCount').textContent =
          `${tagData.totalUniqueTags} tags across ${tagData.totalCardsWithTags} cards`;
  
        const tagList = document.getElementById('topTags');
        tagList.innerHTML = '';
        topTagsData.forEach(tag => {
          const li = document.createElement('li');
          li.textContent = `${tag.name} — ${tag.count}`;
          tagList.appendChild(li);
        });
      } catch (err) {
        console.error('❌ Failed to load admin stats:', err);
      }
    }
  
    async function loadUserTable() {
      try {
        const res = await fetch('/api/admin/users', { credentials: 'include' });
        const users = await res.json();
        const tbody = document.querySelector('#userTable tbody');
        tbody.innerHTML = '';
  
        users.forEach(user => {
          const tr = document.createElement('tr');
          const isProtected = user.role === 'admin' || user.role === 'owner';
          const disabled = isProtected ? 'disabled' : '';
  
          tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.banned ? 'Yes' : 'No'}</td>
            <td>${user.verified ? '✅' : '❌'}</td> <!-- ✅ New verified column -->
            <td>
              <button class="promote-btn" data-id="${user._id}" ${disabled}>🔼 Promote</button>
              <button class="demote-btn" data-id="${user._id}" ${disabled}>🔽 Demote</button>
              <button class="ban-btn" data-id="${user._id}" data-banned="${user.banned}" ${disabled}>
                ${user.banned ? 'Unban' : 'Ban'}
              </button>
            </td>
          `;

          tbody.appendChild(tr);
        });
  
        attachUserActionHandlers();
      } catch (err) {
        console.error('❌ Failed to load users:', err);
      }
    }
  
    function attachUserActionHandlers() {
      document.querySelectorAll('.promote-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const res = await fetch(`/api/admin/users/${id}/promote`, {
            method: 'POST',
            credentials: 'include'
          });
          if (res.ok) {
            loadUserTable();
          } else {
            console.error('❌ Promote failed');
          }
        });
      });
  
      document.querySelectorAll('.demote-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const res = await fetch(`/api/admin/users/${id}/demote`, {
            method: 'POST',
            credentials: 'include'
          });
          if (res.ok) {
            loadUserTable();
          } else {
            console.error('❌ Demote failed');
          }
        });
      });
  
      document.querySelectorAll('.ban-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const res = await fetch(`/api/admin/users/${id}/ban`, {
            method: 'POST',
            credentials: 'include'
          });
          if (res.ok) {
            loadUserTable();
          } else {
            console.error('❌ Ban toggle failed');
          }
        });
      });
    }
  
    // Load everything
    loadAdminStats();
    loadUserTable();
    window.loadUserTable = loadUserTable;

  });
  