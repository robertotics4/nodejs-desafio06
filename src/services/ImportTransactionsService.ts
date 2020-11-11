import { getCustomRepository } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import uploadConfig from '../config/upload';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import CreateTransactionService from '../services/CreateTransactionService';

interface Request {
  transactionsFilename: string;
}

interface TransactionUnsavedDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  private async loadCSV(filePath: string): Promise<TransactionUnsavedDTO[]> {
    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions = [] as TransactionUnsavedDTO[];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;

      transactions.push({
        title,
        type,
        value,
        category,
      });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return transactions;
  }

  async execute({ transactionsFilename }: Request): Promise<Transaction[]> {
    const csvFilePath = `${uploadConfig.directory}/${transactionsFilename}`;

    const transactions = await this.loadCSV(csvFilePath);

    if (!transactions) {
      throw new AppError('Transactions could not be imported.');
    }

    const createTransaction = new CreateTransactionService();

    const savedTransactions = [] as Transaction[];

    try {
      transactions.forEach(async transaction => {
        const createdTransaction = await createTransaction.execute({
          ...transaction,
        });

        savedTransactions.push(createdTransaction);
      });
    } catch (err) {
      throw new AppError(err.message);
    }

    return savedTransactions;
  }
}

export default ImportTransactionsService;
