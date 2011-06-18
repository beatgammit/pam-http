CFLAGS += -Werror -Wall
all: test mypam.so

clean:
	$(RM) test mypam.so *.o

mypam.so: src/mypam.c
	$(CC) $(CFLAGS) -fPIC -shared -Xlinker -x -o $@ $< -lcurl

test: src/test.c
	$(CC) $(CFLAGS) -o $@ $< -lpam -lpam_misc
