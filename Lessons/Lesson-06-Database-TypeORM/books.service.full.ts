// src/books/books.service.ts
import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  BadRequestException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { FilterBooksDto } from './dto/filter-books.dto';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  /**
   * CREATE - Tạo sách mới
   */
  async create(createBookDto: CreateBookDto): Promise<Book> {
    // Kiểm tra ISBN trùng lặp
    if (createBookDto.isbn) {
      const existingBook = await this.bookRepository.findOne({
        where: { isbn: createBookDto.isbn },
      });

      if (existingBook) {
        throw new ConflictException(`ISBN ${createBookDto.isbn} đã tồn tại`);
      }
    }

    // Tạo entity instance từ DTO
    const book = this.bookRepository.create(createBookDto);

    // Lưu vào database
    return await this.bookRepository.save(book);
  }

  /**
   * READ - Lấy tất cả sách với filter và pagination
   */
  async findAll(filterDto: FilterBooksDto) {
    const { genre, minPages, maxPages, search, page = 1, limit = 10 } = filterDto;

    // Build query với QueryBuilder
    const queryBuilder = this.bookRepository.createQueryBuilder('book');

    // Filter by genre
    if (genre) {
      queryBuilder.andWhere('book.genres LIKE :genre', { 
        genre: `%${genre}%` 
      });
    }

    // Filter by pages range
    if (minPages !== undefined && maxPages !== undefined) {
      queryBuilder.andWhere('book.pages BETWEEN :minPages AND :maxPages', {
        minPages,
        maxPages,
      });
    } else if (minPages !== undefined) {
      queryBuilder.andWhere('book.pages >= :minPages', { minPages });
    } else if (maxPages !== undefined) {
      queryBuilder.andWhere('book.pages <= :maxPages', { maxPages });
    }

    // Search by title or description
    if (search) {
      queryBuilder.andWhere(
        '(book.title ILIKE :search OR book.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Pagination
    queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('book.createdAt', 'DESC');

    // Execute query
    const [books, total] = await queryBuilder.getManyAndCount();

    return {
      data: books,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * READ - Lấy một sách theo ID
   */
  async findOne(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id },
    });

    if (!book) {
      throw new NotFoundException(`Không tìm thấy sách với ID ${id}`);
    }

    return book;
  }

  /**
   * READ - Lấy sách theo ISBN
   */
  async findByISBN(isbn: string): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { isbn },
    });

    if (!book) {
      throw new NotFoundException(`Không tìm thấy sách với ISBN ${isbn}`);
    }

    return book;
  }

  /**
   * UPDATE - Cập nhật sách
   */
  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    // Kiểm tra sách tồn tại
    const book = await this.findOne(id);

    // Kiểm tra ISBN trùng lặp (nếu update ISBN)
    if (updateBookDto.isbn && updateBookDto.isbn !== book.isbn) {
      const existingBook = await this.bookRepository.findOne({
        where: { isbn: updateBookDto.isbn },
      });

      if (existingBook) {
        throw new ConflictException(`ISBN ${updateBookDto.isbn} đã tồn tại`);
      }
    }

    // Merge update data vào entity
    Object.assign(book, updateBookDto);

    // Save (TypeORM tự động biết đây là update)
    return await this.bookRepository.save(book);
  }

  /**
   * DELETE - Xóa sách
   */
  async remove(id: number): Promise<void> {
    const result = await this.bookRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy sách với ID ${id}`);
    }
  }

  /**
   * Các methods bổ sung
   */

  // Đếm số lượng sách
  async count(): Promise<number> {
    return await this.bookRepository.count();
  }

  // Kiểm tra sách tồn tại
  async exists(id: number): Promise<boolean> {
    return await this.bookRepository.exist({ where: { id } });
  }

  // Bulk create
  async createMany(createBookDtos: CreateBookDto[]): Promise<Book[]> {
    const books = this.bookRepository.create(createBookDtos);
    return await this.bookRepository.save(books);
  }

  // Soft delete (nếu có deletedAt column)
  async softRemove(id: number): Promise<void> {
    const result = await this.bookRepository.softDelete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy sách với ID ${id}`);
    }
  }
}