// script.js

let categories = localStorage.getItem('categories') ? JSON.parse(localStorage.getItem('categories')) : {
  tests: ['lsat', 'sat', 'act', 'psat', 'dsat'],
  comps: ['deca', 'hosa', 'tsa', 'fbla', 'bpa'],
  proctor: ['lockdown-browser', 'honorlock', 'proctorio', 'proctoru', 'examity']
};
let allSubcats = Object.values(categories).flat();
let isAdmin = false;
let currentCat = '';
let currentSubcat = '';

function updateAllSubcats() {
  allSubcats = Object.values(categories).flat();
}

function saveCategories() {
  localStorage.setItem('categories', JSON.stringify(categories));
  updateAllSubcats();
}

function showSection(section) {
  document.getElementById('main-section').style.display = section === 'main' ? 'flex' : 'none';
  document.getElementById('subcat-section').style.display = section === 'subcat' ? 'grid' : 'none';
  document.getElementById('products-section').style.display = section === 'products' ? 'block' : 'none';
}

function loadSubcats(cat) {
  currentCat = cat;
  const subcatsDiv = document.getElementById('subcats');
  subcatsDiv.innerHTML = '';
  categories[cat].forEach(sub => {
    const card = document.createElement('div');
    card.className = 'subcat-card';
    card.innerHTML = `<h3>${sub.toUpperCase()}</h3>`;
    card.onclick = () => loadProducts(sub);
    if (isAdmin) {
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = 'Delete';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        categories[cat] = categories[cat].filter(s => s !== sub);
        saveCategories();
        loadSubcats(cat);
      };
      card.appendChild(delBtn);
    }
    subcatsDiv.appendChild(card);
  });
  document.getElementById('add-subcat-form').style.display = isAdmin ? 'flex' : 'none';
  showSection('subcat');
}

function loadProducts(sub) {
  currentSubcat = sub;
  document.getElementById('current-subcat').textContent = sub.toUpperCase();
  const list = document.querySelector('.product-list');
  list.innerHTML = '';
  const key = `\( {currentCat}_ \){sub}`;
  const products = JSON.parse(localStorage.getItem(key) || '[]');
  products.forEach((prod, i) => {
    const box = document.createElement('div');
    box.className = 'product-box';
    box.dataset.index = i;
    box.innerHTML = `
      <div class="product-field"><strong>Title:</strong> <span class="prod-title-span">${prod.title}</span></div>
      <div class="product-field"><strong>Description:</strong> <span class="prod-desc-span">${prod.desc}</span></div>
      <div class="product-field"><strong>Rating:</strong> <span class="prod-rating-span">${prod.rating}</span></div>
      <div class="product-field"><strong>Discord User:</strong> <span class="prod-discord-span">${prod.discord}</span></div>
      <div class="product-field"><strong>Payment Method:</strong> <span class="prod-payment-span">${prod.payment}</span></div>
    `;
    if (prod.image) {
      const img = document.createElement('img');
      img.src = prod.image;
      img.className = 'product-img';
      img.alt = 'Product Image';
      box.appendChild(img);
    }
    if (prod.video) {
      const iframe = document.createElement('iframe');
      iframe.src = prod.video.replace('watch?v=', 'embed/');
      iframe.className = 'product-video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      box.appendChild(iframe);
    }
    if (isAdmin) {
      const actions = document.createElement('div');
      actions.className = 'product-actions';
      const edit = document.createElement('button');
      edit.className = 'edit-btn';
      edit.textContent = 'Edit';
      edit.onclick = () => editProduct(box, i);
      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = 'Delete';
      del.onclick = () => deleteProduct(i);
      actions.append(edit, del);
      box.appendChild(actions);
    }
    list.appendChild(box);
  });
  document.getElementById('add-product-form').style.display = isAdmin ? 'flex' : 'none';
  showSection('products');
}

function addProduct() {
  const title = document.querySelector('.prod-title').value.trim();
  const desc = document.querySelector('.prod-desc').value.trim();
  const rating = document.querySelector('.prod-rating').value;
  const discord = document.querySelector('.prod-discord').value.trim();
  const payment = document.querySelector('.prod-payment').value.trim();
  const image = document.querySelector('.prod-image').value.trim();
  const video = document.querySelector('.prod-video').value.trim();
  if (title && desc && rating && discord && payment) {
    const key = `\( {currentCat}_ \){currentSubcat}`;
    const products = JSON.parse(localStorage.getItem(key) || '[]');
    products.push({title, desc, rating, discord, payment, image, video});
    localStorage.setItem(key, JSON.stringify(products));
    loadProducts(currentSubcat);
    document.querySelectorAll('.admin-controls input, .admin-controls textarea').forEach(el => el.value = '');
    document.querySelector('.prod-rating').value = '1';
  } else {
    alert('Fill required fields');
  }
}

function editProduct(box, i) {
  const titleInput = document.createElement('input');
  titleInput.value = box.querySelector('.prod-title-span').textContent;
  box.querySelector('.prod-title-span').replaceWith(titleInput);

  const descTa = document.createElement('textarea');
  descTa.value = box.querySelector('.prod-desc-span').textContent;
  box.querySelector('.prod-desc-span').replaceWith(descTa);

  const ratingSel = document.createElement('select');
  [1,2,3,4,5].forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.text = n;
    if (n == box.querySelector('.prod-rating-span').textContent) opt.selected = true;
    ratingSel.add(opt);
  });
  box.querySelector('.prod-rating-span').replaceWith(ratingSel);

  const discordInput = document.createElement('input');
  discordInput.value = box.querySelector('.prod-discord-span').textContent;
  box.querySelector('.prod-discord-span').replaceWith(discordInput);

  const paymentInput = document.createElement('input');
  paymentInput.value = box.querySelector('.prod-payment-span').textContent;
  box.querySelector('.prod-payment-span').replaceWith(paymentInput);

  const imageInput = document.createElement('input');
  imageInput.value = box.querySelector('.product-img')?.src || '';
  const imageField = document.createElement('div');
  imageField.className = 'product-field';
  imageField.innerHTML = '<strong>Image URL:</strong>';
  imageField.appendChild(imageInput);
  box.appendChild(imageField);

  const videoInput = document.createElement('input');
  videoInput.value = box.querySelector('.product-video')?.src.replace('embed/', 'watch?v=') || '';
  const videoField = document.createElement('div');
  videoField.className = 'product-field';
  videoField.innerHTML = '<strong>Video URL:</strong>';
  videoField.appendChild(videoInput);
  box.appendChild(videoField);

  const actions = box.querySelector('.product-actions');
  actions.innerHTML = '';
  const save = document.createElement('button');
  save.className = 'save-btn';
  save.textContent = 'Save';
  save.onclick = () => saveEdit(i, titleInput.value, descTa.value, ratingSel.value, discordInput.value, paymentInput.value, imageInput.value, videoInput.value);
  const cancel = document.createElement('button');
  cancel.className = 'cancel-btn';
  cancel.textContent = 'Cancel';
  cancel.onclick = () => loadProducts(currentSubcat);
  actions.append(save, cancel);
}

function saveEdit(i, title, desc, rating, discord, payment, image, video) {
  const key = `\( {currentCat}_ \){currentSubcat}`;
  const products = JSON.parse(localStorage.getItem(key) || '[]');
  products[i] = {title, desc, rating, discord, payment, image, video};
  localStorage.setItem(key, JSON.stringify(products));
  loadProducts(currentSubcat);
}

function deleteProduct(i) {
  const key = `\( {currentCat}_ \){currentSubcat}`;
  const products = JSON.parse(localStorage.getItem(key) || '[]');
  products.splice(i, 1);
  localStorage.setItem(key, JSON.stringify(products));
  loadProducts(currentSubcat);
}

function addSubcat() {
  const newSub = document.getElementById('new-subcat').value.trim().toLowerCase();
  if (newSub && !categories[currentCat].includes(newSub)) {
    categories[currentCat].push(newSub);
    saveCategories();
    loadSubcats(currentCat);
    document.getElementById('new-subcat').value = '';
  } else {
    alert('Invalid or duplicate subcategory');
  }
}

document.querySelectorAll('.category-card').forEach(card => {
  card.onclick = () => loadSubcats(card.dataset.cat);
});

document.getElementById('back-to-main').onclick = () => showSection('main');
document.getElementById('back-to-subcats').onclick = () => loadSubcats(currentCat);

document.getElementById('show-login').addEventListener('click', () => {
  document.getElementById('show-login').style.display = 'none';
  document.querySelector('.login-form').style.display = 'flex';
});

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  if (document.getElementById('username').value === 'zues50' && document.getElementById('password').value === 'zues12345') {
    isAdmin = true;
    document.querySelector('.login-form').style.display = 'none';
    document.getElementById('show-login').style.display = 'none';
    document.getElementById('logout').style.display = 'block';
    document.getElementById('welcome').style.display = 'inline';
    if (currentSubcat) loadProducts(currentSubcat);
    else if (currentCat) loadSubcats(currentCat);
  } else {
    alert('Invalid');
  }
});

document.getElementById('logout').addEventListener('click', () => {
  isAdmin = false;
  document.getElementById('show-login').style.display = 'block';
  document.getElementById('logout').style.display = 'none';
  document.getElementById('welcome').style.display = 'none';
  if (currentSubcat) loadProducts(currentSubcat);
  else if (currentCat) loadSubcats(currentCat);
});

document.querySelector('.add-btn').addEventListener('click', addProduct);
document.getElementById('add-subcat-btn').addEventListener('click', addSubcat);

const searchInput = document.querySelector('.search-input');
const suggestions = document.querySelector('.suggestions');
searchInput.addEventListener('input', () => {
  const val = searchInput.value.toLowerCase();
  suggestions.innerHTML = '';
  if (val) {
    const matches = allSubcats.filter(sub => sub.toLowerCase().startsWith(val));
    matches.forEach(match => {
      const div = document.createElement('div');
      div.className = 'suggestion';
      div.textContent = match.toUpperCase();
      div.onclick = () => {
        const cat = Object.keys(categories).find(c => categories[c].includes(match));
        loadProducts(match);
        suggestions.style.display = 'none';
        searchInput.value = '';
      };
      suggestions.appendChild(div);
    });
    suggestions.style.display = matches.length ? 'block' : 'none';
  } else {
    suggestions.style.display = 'none';
  }
});

showSection('main');