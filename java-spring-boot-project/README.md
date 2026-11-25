# Library Management System (Java Spring Boot + SQLite + Bootstrap)

Complete offline-capable localhost Library Management System built for college mini-project evaluation.

## Project Structure

```text
java-spring-boot-project/
├── pom.xml
├── README.md
└── src/
    ├── main/
    │   ├── java/com/library/
    │   │   ├── LibraryApplication.java
    │   │   ├── controller/LibraryController.java
    │   │   ├── model/
    │   │   │   ├── Person.java          (Base class - Inheritance & Encapsulation)
    │   │   │   ├── Student.java         (Extends Person)
    │   │   │   ├── Librarian.java       (Extends Person)
    │   │   │   ├── Book.java            (Encapsulated model)
    │   │   │   └── IssueRecord.java     (Encapsulated model)
    │   │   └── service/
    │   │       ├── FineCalculator.java  (LocalDate + ChronoUnit.DAYS.between(), ₹50/day)
    │   │       ├── Library.java         (ArrayList & HashMap collections)
    │   │       ├── DatabaseManager.java (Local SQLite JDBC persistence)
    │   │       └── FileRecordManager.java (Java File I/O CSV/TXT export & read)
    │   └── resources/
    │       ├── application.properties   (Port 8080, SQLite path)
    │       └── static/
    │           ├── index.html
    │           ├── css/styles.css
    │           └── js/app.js
    └── test/java/com/library/
        └── FineCalculatorTest.java      (JUnit 5 verification for 0, 1, 2, 5 late days)
```

## Prerequisites (One-Time Setup)

1. **Java JDK 17+** (`java -version`)
2. **Apache Maven 3.8+** (`mvn -version`)
3. Download dependencies once while connected to the internet:
   ```bash
   cd java-spring-boot-project
   mvn dependency:go-offline
   ```
   *(Optional for 100% offline Bootstrap)*: Save `bootstrap.min.css` into `src/main/resources/static/css/bootstrap.min.css` and update the `<link>` in `index.html`.

## How to Run (Terminal)

```bash
cd java-spring-boot-project
mvn spring-boot:run
```

For completely offline execution after initial dependency download:

```bash
mvn -o spring-boot:run
```

Then open your browser to:

**http://localhost:8080**

## How to Run in VS Code

1. Install **Extension Pack for Java** and **Spring Boot Extension Pack** in VS Code.
2. Open the `java-spring-boot-project` folder in VS Code (`File -> Open Folder...`).
3. Open `src/main/java/com/library/LibraryApplication.java` and click **Run** above `main()`, or open the VS Code Terminal and run `mvn spring-boot:run`.
4. Visit **http://localhost:8080** in your browser.

## Running Automated Fine Calculation Tests

```bash
cd java-spring-boot-project
mvn test
```

Verified scenarios in `FineCalculatorTest.java`:
- Return on due date = `₹0`
- Return 1 day late = `₹50`
- Return 2 days late = `₹100`
- Return 5 days late = `₹250`
- Return earlier than issue date = throws `IllegalArgumentException`
