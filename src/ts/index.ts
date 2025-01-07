import { Product } from "./Product";

interface CartProducts {
  product: Product;
  quantity: number;
}

const serverUrl = "http://localhost:5000/products";

let cart: Product[] = [];
let displayedProducts = 0;
const PRODUCTS_PER_LOAD = 6;
const INITIAL_PRODUCTS = 6;

// Cart Functions //////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////

//  Busca os produtos da API
async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(serverUrl);
  if (!response.ok) {
    throw new Error("Erro ao buscar os produtos");
  }
  return response.json();
}

//  Formatar o preço em Real (BRL)
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

//  Criar o HTML de um produto
function createProductCard(product: Product): string {
  const { id, name, price, parcelamento, image } = product;  // Incluindo id
  const [installments, installmentValue] = parcelamento;

  return `
    <article class="product-card" data-id="${id}">
      <img src="./assets/${image}" alt="${name}" class="product-card__image">
      <div class="product-card__details">
        <h2 class="product-card__title">${name}</h2>
        <strong class="product-card__price">${formatCurrency(price)}</strong>
        <span class="product-card__installments">
          até ${installments}x de ${formatCurrency(installmentValue)}
        </span>
      </div>
      <button class="product-card__button" data-id="${id}">Comprar</button>
    </article>
  `;
}
//  Capturar valores únicos de um array
function getUniqueValues<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

//  Gerar os filtros dinamicamente com base no JSON de produtos
async function generateFilters() {
  const filtersSidebar = document.querySelector(".filters-sidebar");
  if (!filtersSidebar) {
    console.error("Elemento de filtros não encontrado.");
    return;
  }

  try {
    const products = await fetchProducts();

    // Obter as cores e ordená-las alfabeticamente
    const colors = getUniqueValues(
      products.map((product) => product.color)
    ).sort();

    // Obter os tamanhos e ordená-los, colocando as letras antes dos números
    const sizes = getUniqueValues(products.flatMap((product) => product.size));

    // Definir a ordem desejada para os tamanhos com letras
    const sizeOrder = ["P", "M", "G", "GG", "XG", "U"];

    const sortedSizes = sizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB; // Ordena as letras pela ordem predefinida
      }
      if (indexA !== -1) return -1; // Letras vêm antes dos números
      if (indexB !== -1) return 1; // Letras vêm antes dos números

      const numA = Number(a);
      const numB = Number(b);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    // Criar faixas de preço fixas
    const priceRanges = [
      { start: 0, end: 50 },
      { start: 51, end: 150 },
      { start: 151, end: 300 },
      { start: 301, end: 500 },
      { start: 500, end: Infinity }, // Faixa a partir de 500 até "∞"
    ];

    const colorLimit = 5;
    const colorToShow = colors.slice(0, colorLimit);
    const remainingColors =
      colors.length > colorLimit ? colors.slice(colorLimit) : [];

    filtersSidebar.innerHTML = `
      <div class="filter-group">
        <h3 class="filter-group__title">Cores</h3>
        <div class="filter-options" id="color-filters">
          ${colorToShow
            .map(
              (color) => ` 
              <label class="filter-label">
                <input type="checkbox" name="${color}" id="cor-${color}" class="filter-input">
                <span class="filter-text">${color}</span>
              </label>
            `
            )
            .join("")}
          
          ${
            remainingColors.length > 0
              ? ` 
            <button id="all-colors" class="filter-button filter-button__show-all">Ver todas as cores <img src="assets/svg/down.svg" width="15"></button>
          `
              : ""
          }
        </div>
      </div>

      <div class="filter-group">
        <h3 class="filter-group__title">Tamanhos</h3>
        <div class="filter-options filter-options__tamanho">
          ${sortedSizes
            .map(
              (size) => `
              <label class="filter-label filter-label__tamanho">
                <input type="checkbox" name="${size}" id="tamanho-${size}" class="filter-input filter-input__tamanho">
                <span class="filter-text filter-text__tamanho">${size}</span>
              </label>
            `
            )
            .join("")}
        </div>
      </div>

      <div class="filter-group">
        <h3 class="filter-group__title">Faixa de preço</h3>
        <div class="filter-options">
          ${priceRanges
            .map(
              (range, index) =>
                `<label class="filter-label">
                <input type="checkbox" name="${range.start}-${
                  range.end
                }" id="preco-${index}" class="filter-input">
                <span class="filter-text filter-text-price">
                  ${
                    index === 0
                      ? `de R$&nbsp;0 até R$&nbsp;${formatCurrency(range.end)}`
                      : index === priceRanges.length - 1
                      ? `a partir de R$&nbsp;${formatCurrency(range.start)}`
                      : `de R$&nbsp;${formatCurrency(
                          range.start
                        )} até R$&nbsp;${formatCurrency(range.end)}`
                  }
                </span>
              </label>`
            )
            .join("")}
        </div>
      </div>
    `;

    setupFilterEvents();

    // Handle showing/hiding additional colors
    const showAllButton = document.getElementById("all-colors");
    if (showAllButton) {
      showAllButton.addEventListener("click", () => {
        const colorFilters = document.getElementById("color-filters");
        colorFilters.innerHTML = `
          ${colors
            .map(
              (color) => `
              <label class="filter-label">
                <input type="checkbox" name="${color}" id="cor-${color}" class="filter-input">
                <span class="filter-text">${color}</span>
              </label>
            `
            )
            .join("")}
          <button id="all-colors" class="filter-button filter-button__hide-all">Ocultar outras cores <img src="assets/svg/up.svg" width="15"></button>
        `;

        // Add event listener for hiding the colors
        const hideAllButton = document.getElementById("all-colors");
        if (hideAllButton) {
          hideAllButton.addEventListener("click", () => {
            generateFilters(); // Re-generate filters to reset the view
          });
        }
      });
    }
  } catch (error) {
    console.error("Erro ao gerar filtros:", error);
  }
}

//  Ordenar os produtos com base no critério selecionado
function sortProducts(products: Product[], orderBy: string): Product[] {
  switch (orderBy) {
    case "Menor preço":
      return products.sort((a, b) => a.price - b.price);
    case "Maior preço":
      return products.sort((a, b) => b.price - a.price);
    case "Mais recentes":
      return products.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    default:
      return products;
  }
}

//  Capturar os valores selecionados dos filtros
function getSelectedFilters(): {
  colors: string[];
  sizes: string[];
  priceRanges: [number, number][]; // Array de intervalos de preços
} {
  const selectedColors = Array.from(
    document.querySelectorAll('input[id^="cor-"]:checked')
  ).map((input) => (input as HTMLInputElement).name);

  const selectedSizes = Array.from(
    document.querySelectorAll('input[id^="tamanho-"]:checked')
  ).map((input) => (input as HTMLInputElement).name);

  // Ajuste para capturar os intervalos de preço corretamente
  const selectedPriceRanges = Array.from(
    document.querySelectorAll('input[id^="preco-"]:checked')
  )
    .map((input) => (input as HTMLInputElement).name.split("-").map(Number)) // Dividir o nome em dois valores (ex: "28-99" vira [28, 99])
    .map(([minPrice, maxPrice]) => [minPrice, maxPrice] as [number, number]); // Garantir que seja um array com dois números

  return {
    colors: selectedColors,
    sizes: selectedSizes,
    priceRanges: selectedPriceRanges,
  };
}

//  filtrar os produtos com base nos critérios selecionados
function filterProducts(products: Product[]): Product[] {
  const { colors, sizes, priceRanges } = getSelectedFilters();

  return products.filter((product) => {
    const matchesColor = colors.length === 0 || colors.includes(product.color);
    const matchesSize =
      sizes.length === 0 || product.size.some((size) => sizes.includes(size));

    const matchesPrice =
      priceRanges.length === 0 ||
      priceRanges.some(
        ([min, max]) => product.price >= min && product.price <= max
      );

    return matchesColor && matchesSize && matchesPrice;
  });
}

async function renderProducts(orderBy: string = "") {
  const productList = document.getElementById("product-list");
  const loadMoreButton = document.querySelector(".load-more") as HTMLButtonElement;

  if (!productList) {
    console.error("Elemento da lista de produtos não encontrado.");
    return;
  }

  try {
    let products = await fetchProducts();

    // Aplicar a ordenação
    products = sortProducts(products, orderBy);

    // Atualizar a contagem inicial de produtos exibidos
    displayedProducts = Math.min(displayedProducts || INITIAL_PRODUCTS, products.length);

    // Renderizar apenas os produtos dentro do limite
    productList.innerHTML = products
      .slice(0, displayedProducts)
      .map(createProductCard)
      .join("");

    // Atualizar estado do botão "Carregar mais"
    if (displayedProducts >= products.length) {
      loadMoreButton.disabled = true;
    } else {
      loadMoreButton.disabled = false;
    }

    // Adicionar evento de clique ao botão "Comprar"
    const buyButtons = document.querySelectorAll('.product-card__button');
    buyButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        const productId = Number((event.target as HTMLElement).dataset.id);
        console.log(`Produto clicado: ID ${productId}`);

        // Encontrar o produto clicado (no array de produtos)
        const clickedProduct = products.find(product => Number(product.id) === productId);

        if (clickedProduct && !cart.includes(clickedProduct)) {
          cart.push(clickedProduct);
        }

        // Opcional: Mostrar o array de produtos clicados no console
        console.log("Produtos clicados:", cart);

        // Atualiza a renderização do carrinho após adicionar o produto
        renderCart();
      });
    });

  } catch (error) {
    console.error("Erro ao renderizar os produtos:", error);
    productList.innerHTML = "<p>Não foi possível carregar os produtos.</p>";
  }
}

// Função para renderizar os produtos do carrinho
function renderCart() {
  const cartList = document.getElementById("cart-list");
  const cartTotal = document.getElementById("cart-total");
  const cartBullet = document.getElementById("cart-quantity");

  if (!cartList || !cartTotal) {
    console.error("Elemento da lista de carrinho ou total não encontrado.");
    return;
  }

  // Verifica se o carrinho está vazio
  if (cart.length === 0) {
    cartList.innerHTML = "<p>Seu carrinho está vazio.</p>";
    cartTotal.innerHTML = "Total: R$ 0,00";  // Mostra valor total 0
    cartBullet.style.display = "none";  // Esconde o ícone de quantidade
    return;
  }

  // Renderiza os produtos do carrinho
  cartList.innerHTML = cart
    .map((product, index) => {
      const { name, price, image } = product;
      return `
        <li class="cart-item">
          <img src="./assets/${image}" alt="${name}" class="cart-item__image">
          <div class="cart-item__details">
            <h3 class="cart-item__title">${name}</h3>
            <strong class="cart-item__price">${formatCurrency(price)}</strong>
          </div>
          <button class="remove_product_button" data-index="${index}">
            <img src="assets/svg/trash.svg" width="20" />
          </button>
        </li>
      `;
    })
    .join("");

  // Calcula o total do carrinho
  const total = cart.reduce((acc, product) => acc + product.price, 0);
  cartTotal.innerHTML = `<span>Total: </span><span class="total-value">${formatCurrency(total)}</span>`;

  // Total de itens no carrinho 
  const cartTotalItems = cart.length;
  cartBullet.innerHTML = `${cartTotalItems}`;
  
  // Exibe o ícone de quantidade quando o carrinho não estiver vazio
  cartBullet.style.display = cartTotalItems > 0 ? "block" : "none";

  // Adicionar evento de clique para excluir o produto
  const removeButtons = document.querySelectorAll('.remove_product_button');
  removeButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const index = Number((event.target as HTMLElement).dataset.index); // Obtém o índice do produto
      cart.splice(index, 1); // Remove o produto do carrinho pelo índice
      renderCart(); // Re-renderiza o carrinho
    });
  });
}


//  aplicar os filtros e atualizar a exibição dos produtos
async function applyFilters() {
  try {
    const products = await fetchProducts();
    const filteredProducts = filterProducts(products);

    // Renderizar os produtos filtrados
    const productList = document.getElementById("product-list");
    if (productList) {
      productList.innerHTML = filteredProducts.map(createProductCard).join("");

      // Atualizar estado do botão "Carregar mais"
      const loadMoreButton = document.querySelector(
        ".load-more"
      ) as HTMLButtonElement;

      // Verifica se o número de produtos filtrados é menor ou igual aos exibidos
      if (filteredProducts.length <= displayedProducts) {
        loadMoreButton.style.display = "none"; // Esconde o botão
      } else {
        loadMoreButton.style.display = "block"; // Exibe o botão se houver mais produtos
      }
    }
  } catch (error) {
    console.error("Erro ao aplicar os filtros:", error);
  }
}

//  carregar mais produtos
async function loadMoreProducts() {
  const productList = document.getElementById("product-list");
  const loadMoreButton = document.querySelector(
    ".load-more"
  ) as HTMLButtonElement;

  if (!productList) return;

  try {
    const products = await fetchProducts();

    // Atualizar o limite de produtos exibidos
    const nextDisplayLimit = displayedProducts + PRODUCTS_PER_LOAD;

    // Adiciona os próximos produtos ao DOM
    const newProducts = filterProducts(products).slice(
      displayedProducts,
      nextDisplayLimit
    );
    productList.innerHTML += newProducts.map(createProductCard).join("");

    displayedProducts = nextDisplayLimit;
    // Desativa o botão se todos os produtos foram carregados
    if (displayedProducts >= products.length) {
      loadMoreButton.style.display = "none"; // Esconde o botão
    }
  } catch (error) {
    console.error("Erro ao carregar mais produtos:", error);
  }
}

// Adicionar eventos aos checkboxes dos filtros
function setupFilterEvents() {
  const filterInputs = document.querySelectorAll(".filter-input");
  if (!filterInputs) {
    console.error("Filtros não encontrados.");
    return;
  }

  filterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      applyFilters();
    });
  });
}

// Modificar o evento DOMContentLoaded para incluir os filtros
document.addEventListener("DOMContentLoaded", () => {
  const selectElement = document.getElementById("Ordenar") as HTMLSelectElement;
  const loadMoreButton = document.querySelector(
    ".load-more"
  ) as HTMLButtonElement;

  generateFilters();
  renderProducts();
  renderCart();
  setupFilterEvents();

  // Ordenar produtos ao alterar o select
  selectElement?.addEventListener("change", (event) => {
    const selectedValue = (event.target as HTMLSelectElement).value;
    displayedProducts = INITIAL_PRODUCTS;
    renderProducts(selectedValue);
  });

  // Carregar mais produtos ao clicar no botão
  loadMoreButton?.addEventListener("click", loadMoreProducts);
});
