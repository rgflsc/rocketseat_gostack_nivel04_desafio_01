import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) { }

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer doesn`t exists.');
    }

    const findedProducts = await this.productsRepository.findAllById(products);

    products.forEach(product => {
      const compareProd = findedProducts.find(p => p.id === product.id);

      if (!compareProd) {
        throw new AppError('Products doesn`t exists');
      }

      if (product.quantity > compareProd.quantity) {
        throw new AppError('Not enough products for this operation');
      }
    });

    const mappedProducts = findedProducts.map(p => ({
      product_id: p.id,
      price: p.price,
      quantity: products.find(prod => prod.id === p.id)?.quantity || 0,
    }));

    const orders = await this.ordersRepository.create({
      customer,
      products: mappedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return orders;
  }
}

export default CreateOrderService;
