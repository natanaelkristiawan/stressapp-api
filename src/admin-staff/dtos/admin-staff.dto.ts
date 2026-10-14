import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsIn, ValidateIf, registerDecorator, ValidationOptions, ValidationArguments, IsEmail } from "class-validator";

// Custom validator for password confirmation
function IsPasswordMatch(property: string, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isPasswordMatch',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = (args.object as any)[relatedPropertyName];
                    return value === relatedValue;
                },
                defaultMessage(args: ValidationArguments) {
                    return 'Password and confirm password do not match';
                },
            },
        });
    };
}

export class AdminStaffListDto {

    @ApiProperty({description: "Page", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    page: number;

    @ApiProperty({description: "Limit", example: 10})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    limit: number;

    // set optional 
    @ApiPropertyOptional({description: "Search", example: ""})
    @Type(() => String)
    @IsString()
    @IsOptional()
    search: string;

    @ApiPropertyOptional({
        description: "Sort",
        example: "",
        enum: ["email", "name"],
        default: ""
    })
    @IsOptional()
    @IsString()
    @IsIn(["email", "name"])
    sort?: "email" | "name";

    @ApiPropertyOptional({
        description: "Order",
        example: "asc",
        enum: ["asc", "desc"],
        default: "asc"
    })
    @IsOptional()
    @IsString()
    @IsIn(["asc", "desc"])
    order?: "asc" | "desc";
    
    
    // date string
    @ApiPropertyOptional({description: "Start date (YYYY-MM-DD)", example: ""})
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_date: Date;

    @ApiPropertyOptional({description: "End date (YYYY-MM-DD)", example: ""})
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_date: Date;

    
}       


export class AdminStaffCreateDto {

    @ApiProperty({description: "Select member", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    memberId: number;

    @ApiPropertyOptional({description: "Email", example: "example@example.com"})
    @IsOptional()
    @IsString()
    @IsEmail({}, { message: 'Invalid email format' })
    email?: string;

    // password 
    @ApiProperty({description: "Password", example: "ktb2025!"})
    @IsNotEmpty({ message: 'Password is required' })
    @IsString()
    password: string;

    @ApiProperty({description: "Confirm Password", example: "ktb2025!"})
    @IsNotEmpty({ message: 'Confirm password is required' })
    @IsString()
    @IsPasswordMatch('password')
    confirmPassword: string;

    @ApiPropertyOptional({
        description: "Role,2= Dealer, 1 = Admin, 0 = User",
        example: 1,
        enum: [2, 1, 0],
        default: 0
    })
    @IsOptional()
    @IsNumber()
    @IsIn([2, 1, 0])
    role?: number;
    
}

export class AdminStaffEditDto {

    @ApiProperty({description: "User ID", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    id: number;

    @ApiProperty({description: "Select member", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    memberId: number;

    @ApiPropertyOptional({description: "Email", example: "example@example.com"})    
    @IsOptional()
    @IsString()
    @IsEmail({}, { message: 'Invalid email format' })
    email?: string;


    // password - same treatment as createUserAdmin
    @ApiPropertyOptional({description: "Password", example: "ktb2025!"})
    @IsOptional()
    @IsString()
    password?: string;

    @ApiPropertyOptional({description: "Confirm Password", example: "ktb2025!"})
    @ValidateIf((o) => o.password)
    @IsNotEmpty({ message: 'Confirm password is required when password is provided' })
    @IsString()
    @IsPasswordMatch('password')
    confirmPassword?: string;

    @ApiPropertyOptional({
        description: "Role,2= Dealer, 1 = Admin, 0 = User",
        example: 1,
        enum: [2, 1, 0],
        default: 0
    })
    @IsOptional()
    @IsNumber()
    @IsIn([2, 1, 0])
    role?: number;
    
}