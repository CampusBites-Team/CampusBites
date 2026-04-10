// filter only available items
export const filterAvailableItems = (items) => {
  return items.filter(item => item.available);
};

// toggle availability
export const toggleItemAvailability = (item) => {
  return {
    ...item,
    available: !item.available
  };
};

// format price
export const formatPrice = (price) => {
  return `R${price.toFixed(2)}`;
};