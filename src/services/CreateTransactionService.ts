import { getCustomRepository, getRepository, Raw } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    if (value < 0) {
      throw new AppError('The value is invalid.');
    }

    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('The type is invalid.');
    }

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError('The value is greater than the total available.');
    }

    const categoriesRepository = getRepository(Category);

    let findCategory = await categoriesRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!findCategory) {
      findCategory = categoriesRepository.create({ title: category });

      await categoriesRepository.save(findCategory);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: findCategory.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
