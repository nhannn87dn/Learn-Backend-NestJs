# 2.5.1 Tạo Custom Pipes

Tạo custom pipe để xử lý validation logic phức tạp:

**TrimPipe - Tự động trim whitespace:**

```typescript
// src/common/pipes/trim.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'object' && value !== null) {
      return this.trimObject(value);
    }

    return value;
  }

  private trimObject(obj: any): any {
    const trimmed = {};
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        trimmed[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        trimmed[key] = this.trimObject(obj[key]);
      } else {
        trimmed[key] = obj[key];
      }
    }
    return trimmed;
  }
}
```

**ParseIntPipe - Custom implementation:**

```typescript
// src/common/pipes/parse-int.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    
    if (isNaN(val)) {
      throw new BadRequestException(
        `Validation failed. "${value}" is not a valid integer`
      );
    }
    
    return val;
  }
}
```

**Sử dụng Custom Pipes:**

```typescript
@Controller('books')
export class BooksController {
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    console.log(typeof id); // number
    return this.booksService.findOne(id);
  }

  @Post()
  create(@Body(TrimPipe) createBookDto: CreateBookDto) {
    // Tất cả string fields đã được trim
    return this.booksService.create(createBookDto);
  }
}
```

**Custom Validator Decorator:**

```typescript
// src/common/validators/is-isbn.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isISBN', async: false })
export class IsISBNConstraint implements ValidatorConstraintInterface {
  validate(isbn: string, args: ValidationArguments) {
    if (!isbn) return false;
    
    // Remove hyphens and spaces
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    // ISBN-10 or ISBN-13
    if (cleanISBN.length === 10) {
      return this.validateISBN10(cleanISBN);
    } else if (cleanISBN.length === 13) {
      return this.validateISBN13(cleanISBN);
    }
    
    return false;
  }

  private validateISBN10(isbn: string): boolean {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn[i]) * (10 - i);
    }
    
    const checksum = isbn[9] === 'X' ? 10 : parseInt(isbn[9]);
    sum += checksum;
    
    return sum % 11 === 0;
  }

  private validateISBN13(isbn: string): boolean {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    
    const checksum = (10 - (sum % 10)) % 10;
    return checksum === parseInt(isbn[12]);
  }

  defaultMessage(args: ValidationArguments) {
    return 'ISBN không hợp lệ. Vui lòng nhập ISBN-10 hoặc ISBN-13';
  }
}

// Decorator
export function IsISBN(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsISBNConstraint,
    });
  };
}
```

**Sử dụng custom validator:**

```typescript
// src/books/dto/create-book.dto.ts
import { IsISBN } from '../../common/validators/is-isbn.validator';

export class CreateBookDto {
  // ... các fields khác

  @IsOptional()
  @IsISBN({ message: 'ISBN không hợp lệ' })
  isbn?: string;
}
```